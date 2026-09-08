import { supabase } from "./supabase";
import type { ActivityItem, Call, OrderRow, Product, Profile, Visit } from "./types";

export interface OverallStats {
  totalAccounts: number;
  totalOrders: number;
  totalBouquets: number;
}

/** All-time top-level totals for the manager dashboard's stat tiles. */
export async function fetchOverallStats(): Promise<OverallStats> {
  if (!supabase) return { totalAccounts: 0, totalOrders: 0, totalBouquets: 0 };
  const [accountsRes, ordersRes] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("orders").select("quantity"),
  ]);
  if (accountsRes.error) throw accountsRes.error;
  if (ordersRes.error) throw ordersRes.error;
  const orders = (ordersRes.data ?? []) as { quantity: number }[];
  return {
    totalAccounts: accountsRes.count ?? 0,
    totalOrders: orders.length,
    totalBouquets: orders.reduce((sum, o) => sum + Number(o.quantity), 0),
  };
}

export async function fetchLowStockProducts(): Promise<Product[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Product[]).filter((p) => p.stock_qty <= p.low_stock_threshold);
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

export interface StaffActivityCount {
  profile: Pick<Profile, "id" | "full_name" | "role">;
  count: number;
}

/** How many visits/calls each active rep/telesales agent logged in the last N days. */
export async function fetchStaffActivityCounts(days = 7): Promise<StaffActivityCount[]> {
  if (!supabase) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [staffRes, visitsRes, callsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("active", true)
      .in("role", ["rep", "telesales"]),
    supabase.from("visits").select("rep_id").gte("created_at", since),
    supabase.from("calls").select("telesales_id").gte("created_at", since),
  ]);
  if (staffRes.error) throw staffRes.error;
  if (visitsRes.error) throw visitsRes.error;
  if (callsRes.error) throw callsRes.error;

  const counts = new Map<string, number>();
  for (const v of (visitsRes.data ?? []) as { rep_id: string }[]) {
    counts.set(v.rep_id, (counts.get(v.rep_id) ?? 0) + 1);
  }
  for (const c of (callsRes.data ?? []) as { telesales_id: string }[]) {
    counts.set(c.telesales_id, (counts.get(c.telesales_id) ?? 0) + 1);
  }

  return ((staffRes.data ?? []) as Pick<Profile, "id" | "full_name" | "role">[])
    .map((p) => ({ profile: p, count: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
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
