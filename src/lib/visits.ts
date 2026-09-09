import imageCompression from "browser-image-compression";
import { supabase, VISIT_PHOTOS_BUCKET } from "./supabase";
import { summarizeLines, type OrderLineDraft } from "./orderLines";
import type { NoSaleReason, OrderStatus, Visit, VisitOutcome } from "./types";

export { searchAccounts } from "./accounts";

export interface NewVisitInput {
  /** Generated once by the form and reused on every retry — the database uses it to
   * make sure a double-tap or a dropped connection can never log the visit twice. */
  client_id: string;
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

/** Compress the photo, upload it, then log the visit — and, if sold, its order and every
 * line item — in ONE database transaction (the log_visit function, migration 0017). It
 * all lands or none of it does, and the same client_id on a retry returns the visit
 * already logged instead of a duplicate. A rep can only ever create these, never edit;
 * only a manager can correct one afterward (see updateVisit). */
export async function createVisit(input: NewVisitInput): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");

  const lines = input.order ? summarizeLines(input.order.lines).rows : [];
  if (input.outcome === "sold" && lines.length === 0) {
    throw new Error("A sold visit needs at least one product line");
  }

  // A proof-of-visit photo, not a print — ~300KB at 1280px is plenty, and at the
  // team's volume (dozens of visits a day) storage fills ~3x slower than at 0.8MB.
  const compressed = await imageCompression(input.photo, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
  });

  // The photo path is derived from client_id too, so a retry re-uploads to the same
  // key (upsert) instead of leaving a second copy behind.
  const path = `${input.account_id}/${input.client_id}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(VISIT_PHOTOS_BUCKET)
    .upload(path, compressed, { contentType: compressed.type, upsert: true });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc("log_visit", {
    p_client_id: input.client_id,
    p_account_id: input.account_id,
    p_photo_path: path,
    p_outcome: input.outcome,
    p_no_sale_reason: input.no_sale_reason,
    p_note: input.note,
    p_next_followup_at: input.next_followup_at,
    p_lines: lines,
  });
  if (error) throw error;
  return data as string;
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
