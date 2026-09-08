import { supabase } from "./supabase";

export interface ExportCounts {
  accounts: number;
  visits: number;
  calls: number;
  orders: number;
  products: number;
  staff: number;
  auditLog: number;
}

export async function fetchExportCounts(): Promise<ExportCounts> {
  if (!supabase) {
    return { accounts: 0, visits: 0, calls: 0, orders: 0, products: 0, staff: 0, auditLog: 0 };
  }
  const [accounts, visits, calls, orders, products, staff, auditLog] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("visits").select("id", { count: "exact", head: true }),
    supabase.from("calls").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("audit_log").select("id", { count: "exact", head: true }),
  ]);
  for (const r of [accounts, visits, calls, orders, products, staff, auditLog]) {
    if (r.error) throw r.error;
  }
  return {
    accounts: accounts.count ?? 0,
    visits: visits.count ?? 0,
    calls: calls.count ?? 0,
    orders: orders.count ?? 0,
    products: products.count ?? 0,
    staff: staff.count ?? 0,
    auditLog: auditLog.count ?? 0,
  };
}

/** Pulls every row of every table — literally everything — and writes one .xlsx with a tab per table.
 * The xlsx library is large and only ever needed on this one page, so it's loaded on demand here
 * rather than bundled into every user's initial page load. */
export async function exportAllDataToExcel(filenamePrefix = "flowercom-crm-export"): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const [XLSX, accountsRes, visitsRes, callsRes, ordersRes, productsRes, staffRes, auditRes] = await Promise.all([
    import("xlsx"),
    supabase
      .from("accounts")
      .select("*, assigned_rep:profiles!accounts_assigned_rep_id_fkey(full_name)")
      .order("created_at", { ascending: true }),
    supabase
      .from("visits")
      .select("*, account:accounts!visits_account_id_fkey(name), rep:profiles!visits_rep_id_fkey(full_name)")
      .order("created_at", { ascending: true }),
    supabase
      .from("calls")
      .select(
        "*, account:accounts!calls_account_id_fkey(name), telesales:profiles!calls_telesales_id_fkey(full_name)",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("orders")
      .select(
        "*, account:accounts!orders_account_id_fkey(name), created_by_profile:profiles!orders_created_by_fkey(full_name)",
      )
      .order("created_at", { ascending: true }),
    supabase.from("products").select("*").order("name", { ascending: true }),
    supabase.from("profiles").select("*").order("full_name", { ascending: true }),
    supabase
      .from("audit_log")
      .select("*, changed_by_profile:profiles!audit_log_changed_by_fkey(full_name)")
      .order("changed_at", { ascending: true }),
  ]);
  for (const r of [accountsRes, visitsRes, callsRes, ordersRes, productsRes, staffRes, auditRes]) {
    if (r.error) throw r.error;
  }

  type Row = Record<string, unknown>;

  const accounts = (accountsRes.data ?? []) as Row[];
  const visits = (visitsRes.data ?? []) as Row[];
  const calls = (callsRes.data ?? []) as Row[];
  const orders = (ordersRes.data ?? []) as Row[];
  const products = (productsRes.data ?? []) as Row[];
  const staff = (staffRes.data ?? []) as Row[];
  const auditLog = (auditRes.data ?? []) as Row[];

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
      "Order Items": order?.items ?? "",
      "Order Bouquets": order?.quantity ?? "",
      "Order Amount (IQD)": order?.amount ?? "",
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
      Outcome: c.outcome,
      Note: c.note,
      "Order Items": order?.items ?? "",
      "Order Bouquets": order?.quantity ?? "",
      "Order Amount (IQD)": order?.amount ?? "",
      "Order Status": order?.status ?? "",
      "Created At": c.created_at,
    };
  });

  const orderRows = orders.map((o) => ({
    ID: o.id,
    Shop: (o.account as Row | null)?.name ?? "",
    Source: o.source,
    Items: o.items,
    Bouquets: o.quantity,
    "Amount (IQD)": o.amount,
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "Products");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffRows), "Staff");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditRows), "Edit History");

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}-${dateStamp}.xlsx`);
}
