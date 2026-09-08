import { supabase } from "./supabase";

export interface ExportCounts {
  accounts: number;
  visits: number;
  calls: number;
  orders: number;
  products: number;
  staff: number;
}

export async function fetchExportCounts(): Promise<ExportCounts> {
  if (!supabase) return { accounts: 0, visits: 0, calls: 0, orders: 0, products: 0, staff: 0 };
  const [accounts, visits, calls, orders, products, staff] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase.from("visits").select("id", { count: "exact", head: true }),
    supabase.from("calls").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  for (const r of [accounts, visits, calls, orders, products, staff]) {
    if (r.error) throw r.error;
  }
  return {
    accounts: accounts.count ?? 0,
    visits: visits.count ?? 0,
    calls: calls.count ?? 0,
    orders: orders.count ?? 0,
    products: products.count ?? 0,
    staff: staff.count ?? 0,
  };
}

/** Pulls every row of every table — literally everything — and writes one .xlsx with a tab per table.
 * The xlsx library is large and only ever needed on this one page, so it's loaded on demand here
 * rather than bundled into every user's initial page load. */
export async function exportAllDataToExcel(filenamePrefix = "flowercom-crm-export"): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const [XLSX, accountsRes, visitsRes, callsRes, ordersRes, productsRes, staffRes] = await Promise.all([
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
  ]);
  for (const r of [accountsRes, visitsRes, callsRes, ordersRes, productsRes, staffRes]) {
    if (r.error) throw r.error;
  }

  type Row = Record<string, unknown>;

  const accounts = (accountsRes.data ?? []) as Row[];
  const visits = (visitsRes.data ?? []) as Row[];
  const calls = (callsRes.data ?? []) as Row[];
  const orders = (ordersRes.data ?? []) as Row[];
  const products = (productsRes.data ?? []) as Row[];
  const staff = (staffRes.data ?? []) as Row[];

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

  const visitRows = visits.map((v) => ({
    ID: v.id,
    Shop: (v.account as Row | null)?.name ?? "",
    Rep: (v.rep as Row | null)?.full_name ?? "",
    Outcome: v.outcome,
    "No-Sale Reason": v.no_sale_reason,
    Note: v.note,
    "Created At": v.created_at,
  }));

  const callRows = calls.map((c) => ({
    ID: c.id,
    Shop: (c.account as Row | null)?.name ?? "",
    "Telesales Agent": (c.telesales as Row | null)?.full_name ?? "",
    Outcome: c.outcome,
    Note: c.note,
    "Created At": c.created_at,
  }));

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

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accountRows), "Accounts");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(visitRows), "Visits");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(callRows), "Calls");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Orders");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "Products");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffRows), "Staff");

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}-${dateStamp}.xlsx`);
}
