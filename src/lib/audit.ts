import { supabase } from "./supabase";
import type { AuditEntry } from "./types";

/** Every edit ever made to one record — newest first. Populated automatically by a
 * database trigger on every UPDATE, so this is accurate even for edits made outside the app. */
export async function fetchAuditHistory(tableName: string, recordId: string): Promise<AuditEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("audit_log")
    .select("*, changed_by_profile:profiles!audit_log_changed_by_fkey(id, full_name)")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("changed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AuditEntry[];
}
