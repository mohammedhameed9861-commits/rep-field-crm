import imageCompression from "browser-image-compression";
import { supabase, VISIT_PHOTOS_BUCKET } from "./supabase";
import { insertOrderItems, summarizeLines, type OrderLineDraft } from "./orderLines";
import type { NoSaleReason, OrderStatus, Visit, VisitOutcome } from "./types";

export { searchAccounts } from "./accounts";

export interface NewVisitInput {
  account_id: string;
  rep_id: string;
  photo: File;
  outcome: VisitOutcome;
  no_sale_reason: NoSaleReason | null;
  note: string | null;
  /** A plain "YYYY-MM-DD" date, or null for no follow-up planned. */
  next_followup_at: string | null;
  /** Only used when outcome is "sold" — creates the linked order (and its line items) in
   * the same step. */
  order?: { lines: OrderLineDraft[]; status: OrderStatus };
}

/** Compress the photo, upload it, then insert the visit (and its order, if sold) — a rep can
 * only ever create these, never edit; only a manager can correct one afterward (see updateVisit). */
export async function createVisit(input: NewVisitInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  // A proof-of-visit photo, not a print — ~300KB at 1280px is plenty, and at the
  // team's volume (dozens of visits a day) storage fills ~3x slower than at 0.8MB.
  const compressed = await imageCompression(input.photo, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
  });

  const path = `${input.account_id}/${Date.now()}-${input.photo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from(VISIT_PHOTOS_BUCKET)
    .upload(path, compressed, { contentType: compressed.type });
  if (uploadError) throw uploadError;

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert({
      account_id: input.account_id,
      rep_id: input.rep_id,
      photo_path: path,
      outcome: input.outcome,
      no_sale_reason: input.no_sale_reason,
      note: input.note,
      next_followup_at: input.next_followup_at,
    })
    .select("*")
    .single();
  if (visitError) throw visitError;

  if (input.outcome === "sold" && input.order) {
    const { items, quantity, rows } = summarizeLines(input.order.lines);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        account_id: input.account_id,
        created_by: input.rep_id,
        source: "visit",
        visit_id: visit.id,
        items,
        quantity,
        status: input.order.status,
      })
      .select("id")
      .single();
    if (orderError) throw orderError;
    await insertOrderItems(order.id, rows);
  }
}

export interface VisitEditInput {
  outcome: VisitOutcome;
  no_sale_reason: NoSaleReason | null;
  note: string | null;
  next_followup_at: string | null;
}

/** Manager-only correction of an existing visit — the photo, account, and rep stay fixed;
 * every change is captured automatically in audit_log by a database trigger. */
export async function updateVisit(id: string, input: VisitEditInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("visits").update(input).eq("id", id);
  if (error) throw error;
}

/** Signed URLs for a whole list of visit photos in a handful of requests — the bucket is
 * private, so plain public URLs won't work, and signing them one request per photo (as
 * this used to) meant a page of 200 visits fired 200 storage calls at once. */
export async function visitPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!supabase || paths.length === 0) return {};
  const out: Record<string, string> = {};
  const CHUNK = 100;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const { data, error } = await supabase.storage
      .from(VISIT_PHOTOS_BUCKET)
      .createSignedUrls(paths.slice(i, i + CHUNK), 60 * 60);
    if (error) continue; // a missing photo just shows the grey placeholder
    for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  }
  return out;
}

/** How many of a rep's own visits "My Visits" shows — PostgREST caps any single
 * request at 1000 rows anyway, and a phone doesn't need every visit ever logged. */
export const MY_VISITS_LIMIT = 200;

export async function fetchMyVisits(repId: string): Promise<Visit[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("visits")
    .select("*, account:accounts!visits_account_id_fkey(id, name, area)")
    .eq("rep_id", repId)
    .order("created_at", { ascending: false })
    .limit(MY_VISITS_LIMIT);
  if (error) throw error;
  return (data ?? []) as Visit[];
}

/** The rep's follow-up list — queried on its own rather than filtered out of the recent
 * visits above, so a follow-up set on an older visit doesn't silently drop off. Anything
 * more than 30 days overdue is left out as stale. */
export async function fetchMyVisitFollowUps(repId: string): Promise<Visit[]> {
  if (!supabase) return [];
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data, error } = await supabase
    .from("visits")
    .select("*, account:accounts!visits_account_id_fkey(id, name, area)")
    .eq("rep_id", repId)
    .not("next_followup_at", "is", null)
    .gte("next_followup_at", since.toISOString().slice(0, 10))
    .order("next_followup_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Visit[];
}

export interface VisitFilters {
  repId?: string;
  outcome?: VisitOutcome;
  /** Inclusive, as a plain "YYYY-MM-DD" date. */
  dateFrom?: string;
  /** Inclusive, as a plain "YYYY-MM-DD" date. */
  dateTo?: string;
}

/** Every visit across every rep — the manager's team-wide monitoring view, not one rep's own history. */
export async function fetchAllVisits(filters: VisitFilters = {}): Promise<Visit[]> {
  if (!supabase) return [];
  let q = supabase
    .from("visits")
    .select(
      "*, account:accounts!visits_account_id_fkey(id, name, area), rep:profiles!visits_rep_id_fkey(id, full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (filters.repId) q = q.eq("rep_id", filters.repId);
  if (filters.outcome) q = q.eq("outcome", filters.outcome);
  if (filters.dateFrom) q = q.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) q = q.lte("created_at", `${filters.dateTo}T23:59:59`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Visit[];
}
