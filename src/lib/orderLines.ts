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
