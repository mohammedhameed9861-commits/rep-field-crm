import { supabase } from "./supabase";
import type { InventoryMovementType, Product } from "./types";

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
  critical_threshold: number;
  /** Why the stock number changed — recorded in the inventory movement ledger. */
  movement_type?: InventoryMovementType;
  movement_note?: string | null;
}

/** Both go through database functions (migration 0017) so the stock change and its
 * ledger entry are one transaction; stock is never a bare overwrite. */
export async function createProduct(input: ProductInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.rpc("create_product", {
    p_name: input.name,
    p_stock: input.stock_qty,
    p_low: input.low_stock_threshold,
    p_critical: input.critical_threshold,
    p_movement_type: input.movement_type ?? "received",
    p_note: input.movement_note ?? null,
  });
  if (error) throw error;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.rpc("save_product", {
    p_id: id,
    p_name: input.name,
    p_stock: input.stock_qty,
    p_low: input.low_stock_threshold,
    p_critical: input.critical_threshold,
    p_movement_type: input.movement_type ?? "adjusted",
    p_note: input.movement_note ?? null,
  });
  if (error) throw error;
}
