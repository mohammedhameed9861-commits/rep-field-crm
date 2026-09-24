import { supabase } from "./supabase";
import type { BoardColumn } from "./types";

/** All board columns, in the manager-chosen display order. */
export async function fetchBoardColumns(): Promise<BoardColumn[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("account_board_columns")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BoardColumn[];
}

/** Manager-only (enforced by RLS) — adds a new column after the current last one. */
export async function createBoardColumn(name: string, nextSortOrder: number): Promise<BoardColumn> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("account_board_columns")
    .insert({ name: name.trim(), sort_order: nextSortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as BoardColumn;
}

/** Manager-only (enforced by RLS). */
export async function renameBoardColumn(id: string, name: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("account_board_columns").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

/** Manager-only (enforced by RLS). Shops filed in this column are simply
 * un-filed (board_column_id set to null by the foreign key) — never deleted. */
export async function deleteBoardColumn(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("account_board_columns").delete().eq("id", id);
  if (error) throw error;
}

/** Files a shop into a column, or pass null to take it off the board
 * entirely. Any active staff member can do this — narrower than the
 * manager-only account edit permission, via a dedicated RPC (migration 0018)
 * so this can never touch a shop's name, phone, class, or any other field. */
export async function setAccountBoardColumn(accountId: string, columnId: string | null): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.rpc("set_account_board_column", {
    p_account_id: accountId,
    p_column_id: columnId,
  });
  if (error) throw error;
}
