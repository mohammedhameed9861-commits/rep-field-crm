// Pure logic extracted from NewVisit.tsx so the sold/no-sale visit rules
// can be unit-tested without rendering the full form (GPS, camera, Supabase).
import type { CartItem } from "@/components/ProductPicker";
import type { NoSaleReason } from "@/types/database";

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);
}

export interface CanSubmitVisitParams {
  hasShop: boolean;
  hasGps: boolean;
  hasPhotoInside: boolean;
  hasPhotoOutside: boolean;
  outcome: "sold" | "no_sale" | null;
  cartItemCount: number;
  orderNotes: string;
  finalAmount: string;
  noSaleReason: NoSaleReason | "";
}

export function canSubmitVisit(params: CanSubmitVisitParams): boolean {
  const {
    hasShop,
    hasGps,
    hasPhotoInside,
    hasPhotoOutside,
    outcome,
    cartItemCount,
    orderNotes,
    finalAmount,
    noSaleReason,
  } = params;
  const finalAmountNumber = Number(finalAmount);

  return (
    hasShop &&
    hasGps &&
    hasPhotoInside &&
    hasPhotoOutside &&
    ((outcome === "sold" &&
      (cartItemCount > 0 || orderNotes.trim() !== "") &&
      finalAmount.trim() !== "" &&
      !Number.isNaN(finalAmountNumber) &&
      finalAmountNumber > 0) ||
      (outcome === "no_sale" && noSaleReason !== ""))
  );
}

export interface BuildSaleVisitArgsParams {
  visitId: string;
  shopId: string;
  photoInsidePath: string;
  photoOutsidePath: string;
  gpsLat: number;
  gpsLng: number;
  cartItems: CartItem[];
  finalAmount: number;
  orderNotes: string;
}

export function buildSaleVisitArgs(params: BuildSaleVisitArgsParams) {
  return {
    p_visit_id: params.visitId,
    p_shop_id: params.shopId,
    p_photo_inside_url: params.photoInsidePath,
    p_photo_outside_url: params.photoOutsidePath,
    p_gps_lat: params.gpsLat,
    p_gps_lng: params.gpsLng,
    p_items: params.cartItems.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
    p_final_amount: params.finalAmount,
    p_order_notes: params.orderNotes.trim() || null,
  };
}

export interface BuildNoSaleVisitInsertParams {
  visitId: string;
  repId: string;
  shopId: string;
  photoInsidePath: string;
  photoOutsidePath: string;
  gpsLat: number;
  gpsLng: number;
  noSaleReason: NoSaleReason;
  noSaleNote: string;
}

export function buildNoSaleVisitInsert(params: BuildNoSaleVisitInsertParams) {
  return {
    id: params.visitId,
    rep_id: params.repId,
    shop_id: params.shopId,
    photo_inside_url: params.photoInsidePath,
    photo_outside_url: params.photoOutsidePath,
    gps_lat: params.gpsLat,
    gps_lng: params.gpsLng,
    outcome: "no_sale" as const,
    no_sale_reason: params.noSaleReason,
    no_sale_note: params.noSaleNote.trim() || null,
  };
}
