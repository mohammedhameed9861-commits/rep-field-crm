import { supabase } from "./supabase";

export interface ExportCounts {
  accounts: number;
  visits: number;
  calls: number;
  orders: number;
  orderItems: number;
  products: number;
  inventoryMovements: number;
  staff: number;
  auditLog: number;
}

export async function fetchExportCounts(): Promise<ExportCounts> {
  if (!supabase) {
    return { accounts: 0, visits: 0, calls: 0, orders: 0, orderItems: 0, products: 0, inventoryMovements: 0, staff: 0, auditLog: 0 };
  }
  const [accounts, visits, calls, orders, orderItems, products, inventoryMovements, staff, auditLog] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("visits").select("id", { count: "exact", head: true }),
    supabase.from("calls").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("order_items").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("inventory_movements").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("audit_log").select("id", { count: "exact", head: true }),
  ]);
  for (const r of [accounts, visits, calls, orders, orderItems, products, inventoryMovements, staff, auditLog]) {
    if (r.error) throw r.error;
  }
  return {
    accounts: accounts.count ?? 0,
    visits: visits.count ?? 0,
    calls: calls.count ?? 0,
    orders: orders.count ?? 0,
    orderItems: orderItems.count ?? 0,
    products: products.count ?? 0,
    inventoryMovements: inventoryMovements.count ?? 0,
    staff: staff.count ?? 0,
    auditLog: auditLog.count ?? 0,
  };
}

type Row = Record<string, unknown>;

/** PostgREST silently returns at most 1000 rows per request, so "select everything" is
 * never actually everything once a table grows past that — an export that quietly dropped
 * every visit after the first thousand would be worse than no export. Walk the table in
 * pages instead, until a page comes back short. */
async function fetchAllRows(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<Row[]> {
  const PAGE = 1000;
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

/** Every row of every table, paged past the 1000-row cap, joined with the names a
 * human needs. Shared by the Excel export and the JSON backup. */
async function fetchSnapshot(sb: NonNullable<typeof supabase>) {
  const [accounts, visits, calls, orders, orderItems, products, productTypes, inventoryMovements, settings, staff, auditLog] =
    await Promise.all([
      fetchAllRows((f, t) =>
        sb
          .from("accounts")
          .select("*, assigned_rep:profiles!accounts_assigned_rep_id_fkey(full_name)")
          .order("created_at", { ascending: true })
          .range(f, t),
      ),
      fetchAllRows((f, t) =>
        sb
          .from("visits")
          .select("*, account:accounts!visits_account_id_fkey(name), rep:profiles!visits_rep_id_fkey(full_name)")
          .order("created_at", { ascending: true })
          .range(f, t),
      ),
      fetchAllRows((f, t) =>
        sb
          .from("calls")
          .select(
            "*, account:accounts!calls_account_id_fkey(name), telesales:profiles!calls_telesales_id_fkey(full_name)",
          )
          .order("created_at", { ascending: true })
          .range(f, t),
      ),
      fetchAllRows((f, t) =>
        sb
          .from("orders")
          .select(
            "*, account:accounts!orders_account_id_fkey(name), created_by_profile:profiles!orders_created_by_fkey(full_name)",
          )
          .order("created_at", { ascending: true })
          .range(f, t),
      ),
      fetchAllRows((f, t) => sb.from("order_items").select("*").order("created_at", { ascending: true }).range(f, t)),
      fetchAllRows((f, t) => sb.from("products").select("*").order("name", { ascending: true }).range(f, t)),
      fetchAllRows((f, t) => sb.from("product_types").select("*").order("name", { ascending: true }).range(f, t)),
      fetchAllRows((f, t) =>
        sb
          .from("inventory_movements")
          .select("*, product:products!inventory_movements_product_id_fkey(name), by:profiles!inventory_movements_created_by_fkey(full_name)")
          .order("created_at", { ascending: true })
          .range(f, t),
      ),
      fetchAllRows((f, t) => sb.from("app_settings").select("*").range(f, t)),
      fetchAllRows((f, t) => sb.from("profiles").select("*").order("full_name", { ascending: true }).range(f, t)),
      fetchAllRows((f, t) =>
        sb
          .from("audit_log")
          .select("*, changed_by_profile:profiles!audit_log_changed_by_fkey(full_name)")
          .order("changed_at", { ascending: true })
          .range(f, t),
      ),
    ]);
  return { accounts, visits, calls, orders, orderItems, products, productTypes, inventoryMovements, settings, staff, auditLog };
}

/** The emergency copy: every table, every column, every ID, exactly as stored — plus a
 * manifest (when, which build, how many rows of what). Relationships are preserved as
 * the raw foreign-key columns, so the file can rebuild the database, not just read it.
 * Take one before any migration or infrastructure change and keep it off the server. */
export async function exportBackupJson(filenamePrefix = "flowercom-crm-backup"): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const snap = await fetchSnapshot(supabase);
  const strip = (rows: Row[], joined: string[]) =>
    rows.map((r) => {
      const copy: Row = { ...r };
      for (const k of joined) delete copy[k];
      return copy;
    });
  const tables: Record<string, Row[]> = {
    profiles: snap.staff,
    accounts: strip(snap.accounts, ["assigned_rep"]),
    visits: strip(snap.visits, ["account", "rep"]),
    calls: strip(snap.calls, ["account", "telesales"]),
    orders: strip(snap.orders, ["account", "created_by_profile"]),
    order_items: snap.orderItems,
    products: snap.products,
    product_types: snap.productTypes,
    inventory_movements: strip(snap.inventoryMovements, ["product", "by"]),
    app_settings: snap.settings,
    audit_log: strip(snap.auditLog, ["changed_by_profile"]),
  };
  const allDates = [...snap.visits, ...snap.calls, ...snap.orders].map((r) => r.created_at as string).sort();
  const manifest = {
    format: "flowercom-crm-backup/1",
    exported_at: new Date().toISOString(),
    app_version: __APP_VERSION__,
    app_commit: __APP_COMMIT__,
    data_period: { from: allDates[0] ?? null, to: allDates[allDates.length - 1] ?? null },
    record_counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
    restore_order: ["profiles", "accounts", "product_types", "products", "visits", "calls", "orders", "order_items", "inventory_movements", "app_settings", "audit_log"],
    note: "Rows are verbatim database rows (UUID primary keys and foreign keys intact). Restore in restore_order. profiles.id matches auth.users.id — staff logins themselves live in Supabase Auth and are covered by the pg_dump backup, not this file.",
  };
  const blob = new Blob([JSON.stringify({ manifest, tables }, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Pulls every row of every table — literally everything — and writes one .xlsx with a tab per table.
 * The xlsx library is large and only ever needed on this one page, so it's loaded on demand here
 * rather than bundled into every user's initial page load. */
export async function exportAllDataToExcel(filenamePrefix = "flowercom-crm-export"): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const [XLSX, snap] = await Promise.all([import("xlsx"), fetchSnapshot(supabase)]);
  const { accounts, visits, calls, orders, orderItems, products, productTypes, inventoryMovements, settings, staff, auditLog } = snap;

  // Orders link back to the one visit/call that produced them — build both
  // directions so each visit/call row can show its order inline, without a
  // separate lookup into the Orders tab.
  const orderByVisitId = new Map<string, Row>();
  const orderByCallId = new Map<string, Row>();
  for (const o of orders) {
    if (o.visit_id) orderByVisitId.set(o.visit_id as string, o);
    if (o.call_id) orderByCallId.set(o.call_id as string, o);
  }

  const accountRows = accounts.map((a) => ({
    ID: a.id,
    Name: a.name,
    Area: a.area,
    Phone: a.phone,
    "Shop Class": a.shop_class,
    "Assigned Rep": (a.assigned_rep as Row | null)?.full_name ?? "",
    Active: a.active,
    Notes: a.notes,
    "Created At": a.created_at,
  }));

  const visitRows = visits.map((v) => {
    const order = orderByVisitId.get(v.id as string);
    return {
      ID: v.id,
      Shop: (v.account as Row | null)?.name ?? "",
      Rep: (v.rep as Row | null)?.full_name ?? "",
      Day: (v.created_at as string).slice(0, 10),
      Outcome: v.outcome,
      "No-Sale Reason": v.no_sale_reason,
      Note: v.note,
      "Next Follow-up": v.next_followup_at,
      "Order Items": order?.items ?? "",
      "Order Bouquets": order?.quantity ?? "",
      "Order Status": order?.status ?? "",
      "Created At": v.created_at,
    };
  });

  const callRows = calls.map((c) => {
    const order = orderByCallId.get(c.id as string);
    return {
      ID: c.id,
      Shop: (c.account as Row | null)?.name ?? "",
      "Telesales Agent": (c.telesales as Row | null)?.full_name ?? "",
      Day: (c.created_at as string).slice(0, 10),
      "Call Type": c.call_type,
      Outcome: c.outcome,
      Reason: c.call_reason,
      Note: c.note,
      "Next Follow-up": c.next_followup_at,
      "Order Items": order?.items ?? "",
      "Order Bouquets": order?.quantity ?? "",
      "Order Status": order?.status ?? "",
      "Created At": c.created_at,
    };
  });

  const orderShop = new Map(orders.map((o) => [o.id as string, (o.account as Row | null)?.name ?? ""]));
  const orderItemRows = orderItems.map((i) => ({
    ID: i.id,
    "Order ID": i.order_id,
    Shop: orderShop.get(i.order_id as string) ?? "",
    Product: i.product_name,
    Bouquets: i.quantity,
    "Created At": i.created_at,
  }));

  const orderRows = orders.map((o) => ({
    ID: o.id,
    Shop: (o.account as Row | null)?.name ?? "",
    Source: o.source,
    Items: o.items,
    Bouquets: o.quantity,
    Status: o.status,
    "Logged By": (o.created_by_profile as Row | null)?.full_name ?? "",
    "Created At": o.created_at,
  }));

  const productRows = products.map((p) => ({
    ID: p.id,
    Name: p.name,
    "Stock on Hand": p.stock_qty,
    "Low-Stock Threshold": p.low_stock_threshold,
    "Critical Threshold": p.critical_threshold,
    "Created At": p.created_at,
  }));

  const staffRows = staff.map((p) => ({
    ID: p.id,
    Name: p.full_name,
    Role: p.role,
    Active: p.active,
    "Created At": p.created_at,
  }));

  const auditRows = auditLog.map((a) => ({
    Table: a.table_name,
    "Record ID": a.record_id,
    "Changed By": (a.changed_by_profile as Row | null)?.full_name ?? "",
    "Changed At": a.changed_at,
    Before: JSON.stringify(a.before),
    After: JSON.stringify(a.after),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accountRows), "Accounts");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(visitRows), "Visits");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(callRows), "Calls");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Orders");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderItemRows), "Order Items");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "Products");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      inventoryMovements.map((m) => ({
        ID: m.id,
        Product: (m.product as Row | null)?.name ?? m.product_id,
        Type: m.movement_type,
        Change: m.quantity_delta,
        "Stock After": m.stock_after,
        Note: m.note,
        By: (m.by as Row | null)?.full_name ?? "",
        "Created At": m.created_at,
      })),
    ),
    "Inventory Movements",
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productTypes.map((p) => ({ ID: p.id, Name: p.name, "Created At": p.created_at }))), "Product Types");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settings.map((s) => ({ "Monthly Target (cartons)": s.monthly_target_cartons }))), "Settings");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffRows), "Staff");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditRows), "Edit History");

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}-${dateStamp}.xlsx`);
}
