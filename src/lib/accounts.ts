import { supabase } from "./supabase";
import type { Account, ActivityItem, Call, OrderRow, ShopClass, Visit } from "./types";

export async function fetchAccounts(): Promise<Account[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("accounts")
    .select("*, assigned_rep:profiles!accounts_assigned_rep_id_fkey(id, full_name)")
    .order("name", { ascending: true });
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
