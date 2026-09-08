import { supabase } from "./supabase";
import { fetchSettings } from "./settings";
import type { ActivityItem, Call, OrderRow, Product, Profile, Visit } from "./types";

function startOfDayISO(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function startOfMonthISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export interface TopStats {
  salesToday: number;
  ordersToday: number;
  mtdSales: number;
  targetCartons: number;
  activeAccounts: number;
}

/** The Dashboard's top stat row — today's and month-to-date sales, the monthly target, and active account count. */
export async function fetchTopStats(): Promise<TopStats> {
  if (!supabase) {
    return { salesToday: 0, ordersToday: 0, mtdSales: 0, targetCartons: 1000, activeAccounts: 0 };
  }
  const now = new Date();
  const todayStart = startOfDayISO(now);
  const monthStart = startOfMonthISO(now);

  const [todayRes, monthRes, accountsRes, settings] = await Promise.all([
    supabase.from("orders").select("quantity").gte("created_at", todayStart),
    supabase.from("orders").select("quantity").gte("created_at", monthStart),
    supabase.from("accounts").select("id", { count: "exact", head: true }).eq("active", true),
    fetchSettings(),
  ]);
  if (todayRes.error) throw todayRes.error;
  if (monthRes.error) throw monthRes.error;
  if (accountsRes.error) throw accountsRes.error;

  const todayOrders = (todayRes.data ?? []) as { quantity: number }[];
  const monthOrders = (monthRes.data ?? []) as { quantity: number }[];

  return {
    salesToday: todayOrders.reduce((sum, o) => sum + Number(o.quantity), 0),
    ordersToday: todayOrders.length,
    mtdSales: monthOrders.reduce((sum, o) => sum + Number(o.quantity), 0),
    targetCartons: settings.monthly_target_cartons,
    activeAccounts: accountsRes.count ?? 0,
  };
}

export interface DaySeriesPoint {
  date: string; // "YYYY-MM-DD"
  cartons: number;
}

/** Cartons sold per day, for the last N days (including today) — feeds the small bar chart. */
export async function fetchLast7DaysSeries(days = 7): Promise<DaySeriesPoint[]> {
  if (!supabase) return [];
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("orders")
    .select("quantity, created_at")
    .gte("created_at", since.toISOString());
  if (error) throw error;

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of (data ?? []) as { quantity: number; created_at: string }[]) {
    const key = o.created_at.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(o.quantity));
  }
  return Array.from(buckets.entries()).map(([date, cartons]) => ({ date, cartons }));
}

export interface InventoryAlertCounts {
  low: number;
  critical: number;
}

/** Low counts products at/under their low-stock threshold but above critical; critical counts the more urgent subset. */
export async function fetchInventoryAlertCounts(): Promise<InventoryAlertCounts> {
  if (!supabase) return { low: 0, critical: 0 };
  const { data, error } = await supabase
    .from("products")
    .select("stock_qty, low_stock_threshold, critical_threshold");
  if (error) throw error;
  const products = (data ?? []) as Product[];
  let low = 0;
  let critical = 0;
  for (const p of products) {
    if (p.stock_qty <= p.critical_threshold) critical++;
    else if (p.stock_qty <= p.low_stock_threshold) low++;
  }
  return { low, critical };
}

export interface SalesTeamRow {
  key: string;
  name: string;
  cartons: number;
}

/** Month-to-date cartons per active rep (individually) plus one combined row for all active telesales agents. */
export async function fetchSalesTeamMTD(): Promise<SalesTeamRow[]> {
  if (!supabase) return [];
  const monthStart = startOfMonthISO(new Date());

  const [repsRes, ordersRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").eq("active", true).in("role", ["rep", "telesales"]),
    supabase
      .from("orders")
      .select("created_by, source, quantity")
      .gte("created_at", monthStart),
  ]);
  if (repsRes.error) throw repsRes.error;
  if (ordersRes.error) throw ordersRes.error;

  const staff = (repsRes.data ?? []) as Pick<Profile, "id" | "full_name" | "role">[];
  const orders = (ordersRes.data ?? []) as { created_by: string; source: string; quantity: number }[];

  const perRep = new Map<string, number>();
  let telesalesTotal = 0;
  for (const o of orders) {
    if (o.source === "visit") {
      perRep.set(o.created_by, (perRep.get(o.created_by) ?? 0) + Number(o.quantity));
    } else if (o.source === "call") {
      telesalesTotal += Number(o.quantity);
    }
  }

  const rows: SalesTeamRow[] = staff
    .filter((p) => p.role === "rep")
    .map((p) => ({ key: p.id, name: p.full_name, cartons: perRep.get(p.id) ?? 0 }));

  const hasTelesales = staff.some((p) => p.role === "telesales");
  if (hasTelesales) rows.push({ key: "telesales", name: "Telesales", cartons: telesalesTotal });

  return rows.sort((a, b) => b.cartons - a.cartons);
}

export interface TodayActivityRow {
  key: string;
  name: string;
  count: number;
  cartons: number;
  unit: "visits" | "calls";
}

/** Today's visit/call count and cartons sold, per active rep individually and one combined telesales row. */
export async function fetchTodayActivityByStaff(): Promise<TodayActivityRow[]> {
  if (!supabase) return [];
  const todayStart = startOfDayISO(new Date());

  const [staffRes, visitsRes, callsRes, ordersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("active", true)
      .in("role", ["rep", "telesales"]),
    supabase.from("visits").select("rep_id").gte("created_at", todayStart),
    supabase.from("calls").select("telesales_id").gte("created_at", todayStart),
    supabase.from("orders").select("created_by, source, quantity").gte("created_at", todayStart),
  ]);
  if (staffRes.error) throw staffRes.error;
  if (visitsRes.error) throw visitsRes.error;
  if (callsRes.error) throw callsRes.error;
  if (ordersRes.error) throw ordersRes.error;

  const staff = (staffRes.data ?? []) as Pick<Profile, "id" | "full_name" | "role">[];
  const visitCounts = new Map<string, number>();
  for (const v of (visitsRes.data ?? []) as { rep_id: string }[]) {
    visitCounts.set(v.rep_id, (visitCounts.get(v.rep_id) ?? 0) + 1);
  }
  const callCount = ((callsRes.data ?? []) as { telesales_id: string }[]).length;

  const cartonsByRep = new Map<string, number>();
  let telesalesCartons = 0;
  for (const o of (ordersRes.data ?? []) as { created_by: string; source: string; quantity: number }[]) {
    if (o.source === "visit") cartonsByRep.set(o.created_by, (cartonsByRep.get(o.created_by) ?? 0) + Number(o.quantity));
    else if (o.source === "call") telesalesCartons += Number(o.quantity);
  }

  const rows: TodayActivityRow[] = staff
    .filter((p) => p.role === "rep")
    .map((p) => ({
      key: p.id,
      name: p.full_name,
      count: visitCounts.get(p.id) ?? 0,
      cartons: cartonsByRep.get(p.id) ?? 0,
      unit: "visits",
    }));

  const hasTelesales = staff.some((p) => p.role === "telesales");
  if (hasTelesales) {
    rows.push({ key: "telesales", name: "Telesales", count: callCount, cartons: telesalesCartons, unit: "calls" });
  }

  return rows;
}

export interface NeedsAttentionCounts {
  inactiveHighValue: number;
  declining: number;
  reactivation: number;
}

const INACTIVE_DAYS = 30;
const REACTIVATION_DAYS = 60;
const DECLINE_RATIO = 0.8; // this month's cartons below 80% of last month's counts as "declining"

/**
 * Needs Attention — computed client-side from raw rows (small-scale internal
 * tool, no need for DB-side views):
 *  - inactiveHighValue: active, class A/B account with no visit/call/order in 30+ days.
 *  - declining: an account with real order history whose this-month cartons
 *    are under 80% of last month's.
 *  - reactivation: an account that has ordered before but has had zero
 *    visit/call/order activity in 60+ days.
 */
export async function fetchNeedsAttention(): Promise<NeedsAttentionCounts> {
  if (!supabase) return { inactiveHighValue: 0, declining: 0, reactivation: 0 };

  const now = new Date();
  const thisMonthStart = startOfMonthISO(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [accountsRes, ordersRes, visitsRes, callsRes] = await Promise.all([
    supabase.from("accounts").select("id, shop_class").eq("active", true),
    supabase.from("orders").select("account_id, quantity, created_at"),
    supabase.from("visits").select("account_id, created_at"),
    supabase.from("calls").select("account_id, created_at"),
  ]);
  if (accountsRes.error) throw accountsRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (visitsRes.error) throw visitsRes.error;
  if (callsRes.error) throw callsRes.error;

  const accounts = (accountsRes.data ?? []) as { id: string; shop_class: string | null }[];
  const orders = (ordersRes.data ?? []) as { account_id: string; quantity: number; created_at: string }[];
  const visits = (visitsRes.data ?? []) as { account_id: string; created_at: string }[];
  const calls = (callsRes.data ?? []) as { account_id: string; created_at: string }[];

  const lastActivity = new Map<string, string>();
  const bump = (id: string, at: string) => {
    const cur = lastActivity.get(id);
    if (!cur || at > cur) lastActivity.set(id, at);
  };
  for (const o of orders) bump(o.account_id, o.created_at);
  for (const v of visits) bump(v.account_id, v.created_at);
  for (const c of calls) bump(c.account_id, c.created_at);

  const everOrdered = new Set(orders.map((o) => o.account_id));

  const thisMonthByAccount = new Map<string, number>();
  const lastMonthByAccount = new Map<string, number>();
  for (const o of orders) {
    if (o.created_at >= thisMonthStart) {
      thisMonthByAccount.set(o.account_id, (thisMonthByAccount.get(o.account_id) ?? 0) + Number(o.quantity));
    } else if (o.created_at >= lastMonthStart && o.created_at < thisMonthStart) {
      lastMonthByAccount.set(o.account_id, (lastMonthByAccount.get(o.account_id) ?? 0) + Number(o.quantity));
    }
  }

  const inactiveCutoff = new Date(now);
  inactiveCutoff.setDate(inactiveCutoff.getDate() - INACTIVE_DAYS);
  const reactivationCutoff = new Date(now);
  reactivationCutoff.setDate(reactivationCutoff.getDate() - REACTIVATION_DAYS);

  let inactiveHighValue = 0;
  let declining = 0;
  let reactivation = 0;

  for (const a of accounts) {
    const last = lastActivity.get(a.id);

    if ((a.shop_class === "A" || a.shop_class === "B") && (!last || last < inactiveCutoff.toISOString())) {
      inactiveHighValue++;
    }

    const lastMonthQty = lastMonthByAccount.get(a.id) ?? 0;
    const thisMonthQty = thisMonthByAccount.get(a.id) ?? 0;
    if (lastMonthQty > 0 && thisMonthQty < lastMonthQty * DECLINE_RATIO) {
      declining++;
    }

    if (everOrdered.has(a.id) && (!last || last < reactivationCutoff.toISOString())) {
      reactivation++;
    }
  }

  return { inactiveHighValue, declining, reactivation };
}

/** Visits, calls and orders across every account, merged into one feed — the sitewide version of an account's own activity timeline. */
export async function fetchRecentActivity(limit = 20): Promise<ActivityItem[]> {
  if (!supabase) return [];
  const [ordersRes, visitsRes, callsRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "*, account:accounts!orders_account_id_fkey(id, name, area), created_by_profile:profiles!orders_created_by_fkey(id, full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("visits")
      .select("*, account:accounts!visits_account_id_fkey(id, name, area), rep:profiles!visits_rep_id_fkey(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("calls")
      .select(
        "*, account:accounts!calls_account_id_fkey(id, name, area), telesales:profiles!calls_telesales_id_fkey(id, full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  if (ordersRes.error) throw ordersRes.error;
  if (visitsRes.error) throw visitsRes.error;
  if (callsRes.error) throw callsRes.error;

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const visits = (visitsRes.data ?? []) as Visit[];
  const calls = (callsRes.data ?? []) as Call[];

  return [
    ...orders.map((o): ActivityItem => ({ kind: "order", at: o.created_at, data: o })),
    ...visits.map((v): ActivityItem => ({ kind: "visit", at: v.created_at, data: v })),
    ...calls.map((c): ActivityItem => ({ kind: "call", at: c.created_at, data: c })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit);
}

export interface MyTelesalesStats {
  callsMade: number;
  ordersPlaced: number;
  bouquets: number;
}

/** A telesales agent's own all-time stats, for their personal dashboard. */
export async function fetchMyTelesalesStats(telesalesId: string): Promise<MyTelesalesStats> {
  if (!supabase) return { callsMade: 0, ordersPlaced: 0, bouquets: 0 };
  const [callsRes, ordersRes] = await Promise.all([
    supabase.from("calls").select("id", { count: "exact", head: true }).eq("telesales_id", telesalesId),
    supabase.from("orders").select("quantity").eq("created_by", telesalesId).eq("source", "call"),
  ]);
  if (callsRes.error) throw callsRes.error;
  if (ordersRes.error) throw ordersRes.error;
  const orders = (ordersRes.data ?? []) as { quantity: number }[];
  return {
    callsMade: callsRes.count ?? 0,
    ordersPlaced: orders.length,
    bouquets: orders.reduce((sum, o) => sum + Number(o.quantity), 0),
  };
}
