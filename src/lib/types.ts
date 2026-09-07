export type AppRole = "rep" | "telesales" | "manager";
export type ShopClass = "A" | "B" | "C";
export type VisitOutcome = "sold" | "no_sale";
export type CallOutcome = "order_placed" | "follow_up" | "no_answer";
export type OrderSource = "visit" | "call";
export type OrderStatus = "pending" | "delivered" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
  active: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  area: string | null;
  phone: string | null;
  shop_class: ShopClass | null;
  assigned_rep_id: string | null;
  created_at: string;
  // joined, when queried with the FK expanded
  assigned_rep?: Pick<Profile, "id" | "full_name"> | null;
}

export interface Visit {
  id: string;
  account_id: string;
  rep_id: string;
  photo_path: string;
  outcome: VisitOutcome;
  note: string | null;
  created_at: string;
  rep?: Pick<Profile, "id" | "full_name"> | null;
}

export interface Call {
  id: string;
  account_id: string;
  telesales_id: string;
  outcome: CallOutcome;
  note: string | null;
  created_at: string;
  telesales?: Pick<Profile, "id" | "full_name"> | null;
}

export interface OrderRow {
  id: string;
  account_id: string;
  created_by: string;
  source: OrderSource;
  visit_id: string | null;
  call_id: string | null;
  items: string;
  amount: number;
  quantity: number;
  status: OrderStatus;
  created_at: string;
  created_by_profile?: Pick<Profile, "id" | "full_name"> | null;
}

export interface Product {
  id: string;
  name: string;
  stock_qty: number;
  low_stock_threshold: number;
  created_at: string;
}

/** One combined, chronological feed item for an account's activity timeline. */
export type ActivityItem =
  | { kind: "visit"; at: string; data: Visit }
  | { kind: "call"; at: string; data: Call }
  | { kind: "order"; at: string; data: OrderRow };

export const SHOP_CLASS_LABEL: Record<ShopClass, string> = {
  A: "A · 4–6 cartons/week",
  B: "B · 2.5–3.5 cartons/week",
  C: "C · 1–2 cartons/week",
};
