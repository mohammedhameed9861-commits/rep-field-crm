import { describe, expect, it } from "vitest";
import {
  buildNoSaleVisitInsert,
  buildSaleVisitArgs,
  canSubmitVisit,
  cartTotal,
  type CanSubmitVisitParams,
} from "./visitSubmission";
import type { Product } from "@/types/database";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    sku: null,
    name: "Pepsi",
    price: 1000,
    stock_quantity: 50,
    image_url: null,
    category: null,
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const baseParams: CanSubmitVisitParams = {
  hasShop: true,
  hasGps: true,
  hasPhotoInside: true,
  hasPhotoOutside: true,
  outcome: "sold",
  cartItemCount: 1,
  orderNotes: "",
  finalAmount: "5000",
  noSaleReason: "",
};

describe("cartTotal", () => {
  it("sums quantity * price across items", () => {
    const total = cartTotal([
      { product: makeProduct({ price: 1000 }), quantity: 3 },
      { product: makeProduct({ id: "prod-2", price: 500 }), quantity: 2 },
    ]);
    expect(total).toBe(4000);
  });

  it("returns 0 for an empty cart", () => {
    expect(cartTotal([])).toBe(0);
  });
});

describe("canSubmitVisit", () => {
  it("requires shop, gps, and both photos regardless of outcome", () => {
    expect(canSubmitVisit({ ...baseParams, hasShop: false })).toBe(false);
    expect(canSubmitVisit({ ...baseParams, hasGps: false })).toBe(false);
    expect(canSubmitVisit({ ...baseParams, hasPhotoInside: false })).toBe(false);
    expect(canSubmitVisit({ ...baseParams, hasPhotoOutside: false })).toBe(false);
  });

  it("blocks submit when outcome hasn't been chosen yet", () => {
    expect(canSubmitVisit({ ...baseParams, outcome: null })).toBe(false);
  });

  describe("sold outcome", () => {
    it("allows submit with catalog items and a positive final amount", () => {
      expect(canSubmitVisit({ ...baseParams, cartItemCount: 2, orderNotes: "" })).toBe(true);
    });

    it("allows submit with only free-text order notes and no catalog items", () => {
      expect(canSubmitVisit({ ...baseParams, cartItemCount: 0, orderNotes: "3 boxes of Pepsi" })).toBe(true);
    });

    it("blocks submit when there are no catalog items AND no order notes", () => {
      expect(canSubmitVisit({ ...baseParams, cartItemCount: 0, orderNotes: "   " })).toBe(false);
    });

    it("blocks submit when the final amount is blank", () => {
      expect(canSubmitVisit({ ...baseParams, finalAmount: "" })).toBe(false);
    });

    it("blocks submit when the final amount is zero or negative", () => {
      expect(canSubmitVisit({ ...baseParams, finalAmount: "0" })).toBe(false);
      expect(canSubmitVisit({ ...baseParams, finalAmount: "-10" })).toBe(false);
    });

    it("blocks submit when the final amount isn't a number", () => {
      expect(canSubmitVisit({ ...baseParams, finalAmount: "abc" })).toBe(false);
    });
  });

  describe("no_sale outcome", () => {
    const noSaleBase: CanSubmitVisitParams = { ...baseParams, outcome: "no_sale", cartItemCount: 0 };

    it("blocks submit until a reason is selected", () => {
      expect(canSubmitVisit({ ...noSaleBase, noSaleReason: "" })).toBe(false);
    });

    it("allows submit once a reason is selected", () => {
      expect(canSubmitVisit({ ...noSaleBase, noSaleReason: "price" })).toBe(true);
    });
  });
});

describe("buildSaleVisitArgs", () => {
  it("maps cart items to product_id/quantity pairs and nulls out blank order notes", () => {
    const args = buildSaleVisitArgs({
      visitId: "visit-1",
      shopId: "shop-1",
      photoInsidePath: "rep-1/visit-1/inside.jpg",
      photoOutsidePath: "rep-1/visit-1/outside.jpg",
      gpsLat: 33.3,
      gpsLng: 44.4,
      cartItems: [
        { product: makeProduct({ id: "prod-1" }), quantity: 3 },
        { product: makeProduct({ id: "prod-2" }), quantity: 1 },
      ],
      finalAmount: 5000,
      orderNotes: "   ",
    });

    expect(args).toEqual({
      p_visit_id: "visit-1",
      p_shop_id: "shop-1",
      p_photo_inside_url: "rep-1/visit-1/inside.jpg",
      p_photo_outside_url: "rep-1/visit-1/outside.jpg",
      p_gps_lat: 33.3,
      p_gps_lng: 44.4,
      p_items: [
        { product_id: "prod-1", quantity: 3 },
        { product_id: "prod-2", quantity: 1 },
      ],
      p_final_amount: 5000,
      p_order_notes: null,
    });
  });

  it("keeps trimmed, non-blank order notes", () => {
    const args = buildSaleVisitArgs({
      visitId: "visit-1",
      shopId: "shop-1",
      photoInsidePath: "a.jpg",
      photoOutsidePath: "b.jpg",
      gpsLat: 0,
      gpsLng: 0,
      cartItems: [],
      finalAmount: 100,
      orderNotes: "  3 boxes of Pepsi  ",
    });
    expect(args.p_order_notes).toBe("3 boxes of Pepsi");
    expect(args.p_items).toEqual([]);
  });
});

describe("buildNoSaleVisitInsert", () => {
  it("sets outcome to no_sale and nulls out a blank note", () => {
    const insert = buildNoSaleVisitInsert({
      visitId: "visit-1",
      repId: "rep-1",
      shopId: "shop-1",
      photoInsidePath: "a.jpg",
      photoOutsidePath: "b.jpg",
      gpsLat: 33.3,
      gpsLng: 44.4,
      noSaleReason: "price",
      noSaleNote: "  ",
    });
    expect(insert.outcome).toBe("no_sale");
    expect(insert.no_sale_reason).toBe("price");
    expect(insert.no_sale_note).toBeNull();
  });

  it("keeps a trimmed, non-blank note", () => {
    const insert = buildNoSaleVisitInsert({
      visitId: "visit-1",
      repId: "rep-1",
      shopId: "shop-1",
      photoInsidePath: "a.jpg",
      photoOutsidePath: "b.jpg",
      gpsLat: 0,
      gpsLng: 0,
      noSaleReason: "other",
      noSaleNote: "  owner was on the phone  ",
    });
    expect(insert.no_sale_note).toBe("owner was on the phone");
  });
});
