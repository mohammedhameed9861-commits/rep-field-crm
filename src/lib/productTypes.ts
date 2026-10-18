import { supabase } from "./supabase";
import type { ProductType } from "./types";

/** The one product catalog: every staff member can read it (so reps/telesales see
 * prices), but only a manager can add, edit, or remove an entry (migrations 0013, 0021). */
export async function fetchProductTypes(): Promise<ProductType[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_types")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductType[];
}

export async function createProductType(name: string, price: number): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("product_types").insert({ name, price });
  if (error) throw error;
}

export async function updateProductType(id: string, name: string, price: number): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("product_types").update({ name, price }).eq("id", id);
  if (error) throw error;
}

export async function deleteProductType(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("product_types").delete().eq("id", id);
  if (error) throw error;
}
