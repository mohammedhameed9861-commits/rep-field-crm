import { supabase } from "./supabase";
import type { OrderLineItem } from "./types";

/** One row in the repeatable "Product → Quantity" picker — a draft form value,
 * not yet a real OrderLineItem (quantity stays a string while it's being typed). */
export interface OrderLineDraft {
  product_name: string;
  quantity: string;
}

export function emptyLine(): OrderLineDraft {
  return { product_name: "", quantity: "" };
}

/** Turns the picker's draft rows into what the DB needs: the flat "Red Roses x6,
 * Colored Roses x3" summary text `orders.items` stores, and the total bouquets
 * `orders.quantity` stores — plus the parsed per-line rows to insert into
 * order_items. Blank/zero rows are dropped rather than saved as junk. */
export function summarizeLines(lines: OrderLineDraft[]): {
  items: string;
  quantity: number;
  rows: { product_name: string; quantity: number }[];
} {
  const rows = lines
    .map((l) => ({ product_name: l.product_name.trim(), quantity: Number(l.quantity) || 0 }))
    .filter((l) => l.product_name && l.quantity > 0);
  return {
    items: rows.map((r) => `${r.product_name} x${r.quantity}`).join(", "),
    quantity: rows.reduce((sum, r) => sum + r.quantity, 0),
    rows,
  };
}

export async function fetchOrderItems(orderId: string): Promise<OrderLineItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as OrderLineItem[];
}

/** Insert every line for a brand-new order — called right after the order itself is
 * created, once its id exists. */
export async function insertOrderItems(orderId: string, rows: { product_name: string; quantity: number }[]): Promise<void> {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase
    .from("order_items")
    .insert(rows.map((r) => ({ order_id: orderId, product_name: r.product_name, quantity: r.quantity })));
  if (error) throw error;
}

/** A manager's correction replaces every line wholesale — simpler and safer than
 * diffing which lines changed, added, or were removed. */
export async function replaceOrderItems(orderId: string, rows: { product_name: string; quantity: number }[]): Promise<void> {
  if (!supabase) return;
  const { error: deleteError } = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (deleteError) throw deleteError;
  await insertOrderItems(orderId, rows);
}
