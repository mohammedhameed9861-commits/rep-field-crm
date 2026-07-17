// Hand-written to match supabase/migrations/0001_schema.sql.
// Regenerate with `supabase gen types typescript` once the project is
// linked, if you prefer generated types.

export type Role = "rep" | "manager";
export type Outcome = "sold" | "no_sale";
export type NoSaleReason =
  | "price"
  | "no_stock_need"
  | "competitor"
  | "no_cash"
  | "not_requested"
  | "delivery_problem"
  | "owner_absent"
  | "previous_complaint"
  | "credit_issue"
  | "other";
export type ShopClassification = "A" | "B" | "C";

// NOTE: these must be `type`, not `interface` — interfaces break Supabase's
// generic type inference (PostgrestQueryBuilder resolves Insert/Update to
// `never` when Database['public']['Tables'][x]['Row'] etc. are interfaces
// instead of plain object type aliases).
export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: Role;
  active: boolean;
  daily_target: number | null;
  created_at: string;
};

export type Shop = {
  id: string;
  shop_name: string;
  shop_number: string | null;
  lat: number | null;
  lng: number | null;
  classification: ShopClassification | null;
  created_by: string | null;
  created_at: string;
};

export type Visit = {
  id: string;
  rep_id: string;
  shop_id: string;
  visit_time: string;
  photo_inside_url: string;
  photo_outside_url: string;
  gps_lat: number;
  gps_lng: number;
  outcome: Outcome;
  sale_amount: number | null;
  no_sale_reason: NoSaleReason | null;
  no_sale_note: string | null;
  order_notes: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  invoice_number: number;
  visit_id: string;
  rep_id: string;
  shop_id: string;
  amount: number;
  created_at: string;
};

export type Product = {
  id: string;
  sku: string | null;
  name: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  visit_id: string;
  product_id: string | null;
  custom_name: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
};

export type BatchStatus = "draft" | "prepared" | "sent";

export type InvoiceBatch = {
  id: string;
  rep_id: string;
  status: BatchStatus;
  created_by: string | null;
  created_at: string;
  prepared_at: string | null;
  sent_at: string | null;
};

export type InvoiceBatchItem = {
  id: string;
  batch_id: string;
  invoice_id: string;
  created_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; full_name: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      shops: {
        Row: Shop;
        Insert: Partial<Shop> & { shop_name: string };
        Update: Partial<Shop>;
        Relationships: [
          {
            foreignKeyName: "shops_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      visits: {
        Row: Visit;
        Insert: Partial<Visit> & {
          rep_id: string;
          shop_id: string;
          photo_inside_url: string;
          photo_outside_url: string;
          gps_lat: number;
          gps_lng: number;
          outcome: Outcome;
        };
        Update: Partial<Visit>;
        Relationships: [
          {
            foreignKeyName: "visits_rep_id_fkey";
            columns: ["rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: Invoice;
        Insert: Partial<Invoice>;
        Update: Partial<Invoice>;
        Relationships: [
          {
            foreignKeyName: "invoices_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: true;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_rep_id_fkey";
            columns: ["rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & { name: string; price: number };
        Update: Partial<Product>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItem;
        Insert: Partial<OrderItem> & {
          visit_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: Partial<OrderItem>;
        Relationships: [
          {
            foreignKeyName: "order_items_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: false;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_batches: {
        Row: InvoiceBatch;
        Insert: Partial<InvoiceBatch> & { rep_id: string };
        Update: Partial<InvoiceBatch>;
        Relationships: [
          {
            foreignKeyName: "invoice_batches_rep_id_fkey";
            columns: ["rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_batch_items: {
        Row: InvoiceBatchItem;
        Insert: Partial<InvoiceBatchItem> & { batch_id: string; invoice_id: string };
        Update: Partial<InvoiceBatchItem>;
        Relationships: [
          {
            foreignKeyName: "invoice_batch_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "invoice_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_batch_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: true;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_sale_visit: {
        Args: {
          p_visit_id: string;
          p_shop_id: string;
          p_photo_inside_url: string;
          p_photo_outside_url: string;
          p_gps_lat: number;
          p_gps_lng: number;
          p_items: { product_id: string; quantity: number }[];
          p_final_amount: number;
          p_order_notes?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
