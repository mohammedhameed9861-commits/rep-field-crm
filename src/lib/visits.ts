import imageCompression from "browser-image-compression";
import { supabase, VISIT_PHOTOS_BUCKET } from "./supabase";
import type { NoSaleReason, OrderStatus, Visit, VisitOutcome } from "./types";

export { searchAccounts } from "./accounts";

export interface NewVisitInput {
  account_id: string;
  rep_id: string;
  photo: File;
  outcome: VisitOutcome;
  no_sale_reason: NoSaleReason | null;
  note: string | null;
  /** Only used when outcome is "sold" — creates the linked order in the same step. */
  order?: { items: string; quantity: number; amount: number; status: OrderStatus };
}

/** Compress the photo, upload it, then insert the visit (and its order, if sold) — a rep can
 * only ever create these, never edit; only a manager can correct one afterward (see updateVisit). */
export async function createVisit(input: NewVisitInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const compressed = await imageCompression(input.photo, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
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
    })
    .select("*")
    .single();
  if (visitError) throw visitError;

  if (input.outcome === "sold" && input.order) {
    const { error: orderError } = await supabase.from("orders").insert({
      account_id: input.account_id,
      created_by: input.rep_id,
      source: "visit",
      visit_id: visit.id,
      items: input.order.items,
      amount: input.order.amount,
      quantity: input.order.quantity,
      status: input.order.status,
    });
    if (orderError) throw orderError;
  }
}

export interface VisitEditInput {
  outcome: VisitOutcome;
  no_sale_reason: NoSaleReason | null;
  note: string | null;
}

/** Manager-only correction of an existing visit — the photo, account, and rep stay fixed;
 * every change is captured automatically in audit_log by a database trigger. */
export async function updateVisit(id: string, input: VisitEditInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("visits").update(input).eq("id", id);
  if (error) throw error;
}

/** A signed URL for a visit photo — the bucket is private, so plain public URLs won't work. */
export async function visitPhotoUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(VISIT_PHOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function fetchMyVisits(repId: string): Promise<Visit[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("visits")
    .select("*, account:accounts!visits_account_id_fkey(id, name, area)")
    .eq("rep_id", repId)
    .order("created_at", { ascending: false });
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
