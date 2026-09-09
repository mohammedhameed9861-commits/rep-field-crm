import { supabase } from "./supabase";
import { summarizeLines, type OrderLineDraft } from "./orderLines";
import type { Account, ActivityItem, Call, OrderRow, OrderStatus, ShopClass, Visit } from "./types";

export async function fetchAccounts(): Promise<Account[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("accounts")
    .select("*, assigned_rep:profiles!accounts_assigned_rep_id_fkey(id, full_name)")
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Account[];
}

/** Search any active shop by name — reps and telesales can log activity against any account, not just assigned ones. */
export async function searchAccounts(query: string): Promise<Account[]> {
  if (!supabase) return [];
  let q = supabase.from("accounts").select("*").eq("active", true).order("name", { ascending: true });
  if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
  const { data, error } = await q.limit(25);
  if (error) throw error;
  return (data ?? []) as Account[];
}

export async function fetchAccount(id: string): Promise<Account | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("accounts")
    .select("*, assigned_rep:profiles!accounts_assigned_rep_id_fkey(id, full_name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Account;
}

export interface AccountInput {
  name: string;
  area: string | null;
  phone: string | null;
  shop_class: ShopClass | null;
  assigned_rep_id: string | null;
  notes: string | null;
}

export async function createAccount(input: AccountInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("accounts").insert(input);
  if (error) throw error;
}

export async function updateAccount(id: string, input: AccountInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("accounts").update(input).eq("id", id);
  if (error) throw error;
}

/** Archive/reactivate — accounts are never hard-deleted, only hidden. */
export async function setAccountActive(id: string, active: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("accounts").update({ active }).eq("id", id);
  if (error) throw error;
}

export interface OrderEditInput {
  lines: OrderLineDraft[];
  status: OrderStatus;
}

/** Manager-only correction of an existing order — audited automatically by a database trigger.
 * The source (visit/call) and which one it's linked to stay fixed; only the sale details change.
 * Line items are replaced wholesale rather than diffed field by field. */
export async function updateOrder(id: string, input: OrderEditInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { rows } = summarizeLines(input.lines);
  if (rows.length === 0) throw new Error("An order needs at least one product line");
  // One transaction: summary, total, status and every line row (replace_order_lines,
  // migration 0017) — never an order whose lines were deleted but not re-inserted.
  const { error } = await supabase.rpc("replace_order_lines", {
    p_order_id: id,
    p_lines: rows,
    p_status: input.status,
  });
  if (error) throw error;
}

/** Orders, visits and calls for one account, merged into one chronological feed. */
export async function fetchAccountActivity(accountId: string): Promise<{
  orders: OrderRow[];
  activity: ActivityItem[];
}> {
  if (!supabase) return { orders: [], activity: [] };

  const [ordersRes, visitsRes, callsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*, created_by_profile:profiles!orders_created_by_fkey(id, full_name)")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("visits")
      .select("*, rep:profiles!visits_rep_id_fkey(id, full_name)")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("calls")
      .select("*, telesales:profiles!calls_telesales_id_fkey(id, full_name)")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (visitsRes.error) throw visitsRes.error;
  if (callsRes.error) throw callsRes.error;

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const visits = (visitsRes.data ?? []) as Visit[];
  const calls = (callsRes.data ?? []) as Call[];

  const activity: ActivityItem[] = [
    ...orders.map((o): ActivityItem => ({ kind: "order", at: o.created_at, data: o })),
    ...visits.map((v): ActivityItem => ({ kind: "visit", at: v.created_at, data: v })),
    ...calls.map((c): ActivityItem => ({ kind: "call", at: c.created_at, data: c })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return { orders, activity };
}
