import imageCompression from "browser-image-compression";
import { supabase, VISIT_PHOTOS_BUCKET } from "./supabase";
import type { Account, NoSaleReason, OrderStatus, Visit, VisitOutcome } from "./types";

/** Search any shop by name — reps can log a visit at any account, not just their assigned ones. */
export async function searchAccounts(query: string): Promise<Account[]> {
  if (!supabase) return [];
  let q = supabase.from("accounts").select("*").eq("active", true).order("name", { ascending: true });
  if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
  const { data, error } = await q.limit(25);
  if (error) throw error;
  return (data ?? []) as Account[];
}

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

/** Compress the photo, upload it, then insert the visit (and its order, if sold) — insert-only, no edits after the fact. */
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
