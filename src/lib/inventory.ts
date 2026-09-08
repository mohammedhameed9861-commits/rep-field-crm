import { supabase } from "./supabase";
import type { Product } from "./types";

export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Product[];
}

export interface ProductInput {
  name: string;
  stock_qty: number;
  low_stock_threshold: number;
}

export async function createProduct(input: ProductInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("products").insert(input);
  if (error) throw error;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("products").update(input).eq("id", id);
  if (error) throw error;
}
