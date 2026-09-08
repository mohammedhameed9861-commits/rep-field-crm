export type AppRole = "rep" | "telesales" | "manager";
export type ShopClass = "A" | "B" | "C";
export type VisitOutcome = "sold" | "no_sale";
export type NoSaleReason = "closed" | "not_interested" | "already_stocked" | "other";
export type CallOutcome = "order_placed" | "follow_up" | "no_answer";
export type OrderSource = "visit" | "call";
export type OrderStatus = "pending" | "delivered" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
  active: boolean;
  /** A rep's own monthly cartons target, set by a manager — separate from the company-wide one in AppSettings. */
  monthly_target_cartons: number | null;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  area: string | null;
  phone: string | null;
  shop_class: ShopClass | null;
  assigned_rep_id: string | null;
  active: boolean;
  notes: string | null;
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
  no_sale_reason: NoSaleReason | null;
  note: string | null;
  created_at: string;
  rep?: Pick<Profile, "id" | "full_name"> | null;
  account?: Pick<Account, "id" | "name" | "area"> | null;
}

export interface Call {
  id: string;
  account_id: string;
  telesales_id: string;
  outcome: CallOutcome;
  note: string | null;
  created_at: string;
  telesales?: Pick<Profile, "id" | "full_name"> | null;
  account?: Pick<Account, "id" | "name" | "area"> | null;
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
  account?: Pick<Account, "id" | "name" | "area"> | null;
}

export interface Product {
  id: string;
  name: string;
  stock_qty: number;
  low_stock_threshold: number;
  critical_threshold: number;
  created_at: string;
}

export interface AppSettings {
  monthly_target_cartons: number;
}

/** One combined, chronological feed item for an account's activity timeline. */
export type ActivityItem =
  | { kind: "visit"; at: string; data: Visit }
  | { kind: "call"; at: string; data: Call }
  | { kind: "order"; at: string; data: OrderRow };
