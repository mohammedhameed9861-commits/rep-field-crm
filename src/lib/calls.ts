import { supabase } from "./supabase";
import { summarizeLines, type OrderLineDraft } from "./orderLines";
import type { Call, CallOutcome, CallReason, CallType, OrderStatus } from "./types";

export { searchAccounts } from "./accounts";

export interface NewCallInput {
  /** See NewVisitInput.client_id — the retry/double-tap guard. */
  client_id: string;
  account_id: string;
  telesales_id: string;
  call_type: CallType;
  outcome: CallOutcome;
  call_reason: CallReason | null;
  note: string | null;
  /** A plain "YYYY-MM-DD" date, or null for no follow-up planned — only meaningful when
   * outcome is "interested_callback"; the form never sets it for any other outcome. */
  next_followup_at: string | null;
  /** Only used when outcome is "order_placed" — creates the linked order (and its line
   * items) in the same step. */
  order?: { lines: OrderLineDraft[]; status: OrderStatus };
}

/** Logs the call — and, for a placed order, the order and its lines — in one database
 * transaction, idempotent on client_id (log_call, migration 0017). An agent can only
 * ever create these, never edit; only a manager can correct one afterward (updateCall). */
export async function createCall(input: NewCallInput): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const lines = input.order ? summarizeLines(input.order.lines).rows : [];
  if (input.outcome === "order_placed" && lines.length === 0) {
    throw new Error("A placed order needs at least one product line");
  }
  const { data, error } = await supabase.rpc("log_call", {
    p_client_id: input.client_id,
    p_account_id: input.account_id,
    p_call_type: input.call_type,
    p_outcome: input.outcome,
    p_call_reason: input.call_reason,
    p_note: input.note,
    p_next_followup_at: input.next_followup_at,
    p_lines: lines,
  });
  if (error) throw error;
  return data as string;
}

export interface CallEditInput {
  call_type: CallType | null;
  outcome: CallOutcome;
  call_reason: CallReason | null;
  note: string | null;
  next_followup_at: string | null;
}

/** Manager-only correction of an existing call — audited automatically by a database trigger. */
export async function updateCall(id: string, input: CallEditInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("calls").update(input).eq("id", id);
  if (error) throw error;
}

/** How many of an agent's own calls "My Calls" shows — PostgREST caps any single
 * request at 1000 rows anyway, and nobody scrolls past the last couple hundred. */
export const MY_CALLS_LIMIT = 200;

export async function fetchMyCalls(telesalesId: string): Promise<Call[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("calls")
    .select("*, account:accounts!calls_account_id_fkey(id, name, area)")
    .eq("telesales_id", telesalesId)
    .order("created_at", { ascending: false })
    .limit(MY_CALLS_LIMIT);
  if (error) throw error;
  return (data ?? []) as Call[];
}

/** The agent's follow-up list, queried on its own (see fetchMyVisitFollowUps). */
export async function fetchMyCallFollowUps(telesalesId: string): Promise<Call[]> {
  if (!supabase) return [];
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data, error } = await supabase
    .from("calls")
    .select("*, account:accounts!calls_account_id_fkey(id, name, area)")
    .eq("telesales_id", telesalesId)
    .not("next_followup_at", "is", null)
    .gte("next_followup_at", since.toISOString().slice(0, 10))
    .order("next_followup_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Call[];
}

export interface CallFilters {
  telesalesId?: string;
  outcome?: CallOutcome;
  callType?: CallType;
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
  if (filters.callType) q = q.eq("call_type", filters.callType);
  if (filters.dateFrom) q = q.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) q = q.lte("created_at", `${filters.dateTo}T23:59:59`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Call[];
}
