import { supabase } from "./supabase";
import type { Call, CallOutcome, OrderStatus } from "./types";

export { searchAccounts } from "./accounts";

export interface NewCallInput {
  account_id: string;
  telesales_id: string;
  outcome: CallOutcome;
  note: string | null;
  /** Only used when outcome is "order_placed" — creates the linked order in the same step. */
  order?: { items: string; quantity: number; amount: number; status: OrderStatus };
}

/** Insert-only, like visits — no editing a call after the fact. */
export async function createCall(input: NewCallInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: call, error: callError } = await supabase
    .from("calls")
    .insert({
      account_id: input.account_id,
      telesales_id: input.telesales_id,
      outcome: input.outcome,
      note: input.note,
    })
    .select("*")
    .single();
  if (callError) throw callError;

  if (input.outcome === "order_placed" && input.order) {
    const { error: orderError } = await supabase.from("orders").insert({
      account_id: input.account_id,
      created_by: input.telesales_id,
      source: "call",
      call_id: call.id,
      items: input.order.items,
      amount: input.order.amount,
      quantity: input.order.quantity,
      status: input.order.status,
    });
    if (orderError) throw orderError;
  }
}

export async function fetchMyCalls(telesalesId: string): Promise<Call[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("calls")
    .select("*, account:accounts!calls_account_id_fkey(id, name, area)")
    .eq("telesales_id", telesalesId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Call[];
}

export interface CallFilters {
  telesalesId?: string;
  outcome?: CallOutcome;
  /** Inclusive, as a plain "YYYY-MM-DD" date. */
  dateFrom?: string;
  /** Inclusive, as a plain "YYYY-MM-DD" date. */
  dateTo?: string;
}

/** Every call across every agent — the manager's team-wide rollup, not one agent's own history. */
export async function fetchAllCalls(filters: CallFilters = {}): Promise<Call[]> {
  if (!supabase) return [];
  let q = supabase
    .from("calls")
    .select(
      "*, account:accounts!calls_account_id_fkey(id, name, area), telesales:profiles!calls_telesales_id_fkey(id, full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (filters.telesalesId) q = q.eq("telesales_id", filters.telesalesId);
  if (filters.outcome) q = q.eq("outcome", filters.outcome);
  if (filters.dateFrom) q = q.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) q = q.lte("created_at", `${filters.dateTo}T23:59:59`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Call[];
}
