export type AppRole = "rep" | "telesales" | "manager";
export type ShopClass = "A" | "B" | "C";
export type VisitOutcome = "sold" | "no_sale";
export type NoSaleReason =
  | "no_need_today"
  | "price_too_high"
  | "bought_competitor"
  | "no_stock_needed"
  | "quality_concern"
  | "shop_closed"
  | "owner_unavailable"
  | "payment_issue"
  | "other";
export type CallOutcome = "interested_callback" | "not_interested" | "order_placed" | "no_answer";
/** What kind of call this is, independent of how it went. */
export type CallType = "new_customer" | "reactivation" | "follow_up";
/** Covers both "why interested" and "why not" — only one applies per call, so one
 * column does for both (see migration 0014's check constraint for which outcome
 * requires, allows, or forbids one). */
export type CallReason =
  | "wants_price"
  | "wants_availability"
  | "wants_specific_flower"
  | "waiting_next_purchase"
  | "needs_owner_approval"
  | "price_too_high"
  | "bought_competitor"
  | "no_current_demand"
  | "quality_concern"
  | "doesnt_want_change_supplier"
  | "other";
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
  /** A plain "YYYY-MM-DD" date, or null for no follow-up planned. */
  next_followup_at: string | null;
  created_at: string;
  /** Set only once a manager edits the row — null means never touched since it was logged. */
  updated_at: string | null;
  rep?: Pick<Profile, "id" | "full_name"> | null;
  account?: Pick<Account, "id" | "name" | "area"> | null;
}

export interface Call {
  id: string;
  account_id: string;
  telesales_id: string;
  outcome: CallOutcome;
  /** Null only for calls logged before Call Type existed — always set on a new one. */
  call_type: CallType | null;
  call_reason: CallReason | null;
  note: string | null;
  next_followup_at: string | null;
  created_at: string;
  updated_at: string | null;
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
  /** Still a real DB column (kept for old rows' history), but no longer collected, shown,
   * or editable anywhere in the app — the business only tracks bouquets (quantity), not IQD. */
  amount: number;
  quantity: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string | null;
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

/** A manager-curated picklist for naming a new product — keeps "Red Roses" from
 * also showing up as "red roses" or "Red Rose" depending on who typed it. */
export interface ProductType {
  id: string;
  name: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  changed_by: string | null;
  changed_at: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  changed_by_profile?: Pick<Profile, "id" | "full_name"> | null;
}

/** One combined, chronological feed item for an account's activity timeline. */
export type ActivityItem =
  | { kind: "visit"; at: string; data: Visit }
  | { kind: "call"; at: string; data: Call }
  | { kind: "order"; at: string; data: OrderRow };
