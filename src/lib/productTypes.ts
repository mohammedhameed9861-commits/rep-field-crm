import { supabase } from "./supabase";
import type { ProductType } from "./types";

/** The manager-curated picklist "Add Product" chooses a type from — every staff member can
 * read it, but only a manager can add or remove an entry (see migration 0013). */
export async function fetchProductTypes(): Promise<ProductType[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_types")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductType[];
}

export async function createProductType(name: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("product_types").insert({ name });
  if (error) throw error;
}

export async function deleteProductType(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("product_types").delete().eq("id", id);
  if (error) throw error;
}
