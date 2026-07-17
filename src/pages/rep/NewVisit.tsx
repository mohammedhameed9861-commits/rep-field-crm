import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getCurrentPosition, type GpsPosition } from "@/lib/geolocation";
import { ShopPicker } from "@/components/ShopPicker";
import { PhotoCapture } from "@/components/PhotoCapture";
import { ProductPicker, type CartItem } from "@/components/ProductPicker";
import { Button } from "@/components/Button";
import type { NoSaleReason, Shop, ShopClassification } from "@/types/database";

type ShopSelection =
  | Shop
  | { shop_name: string; shop_number: string | null; isNew: true; classification?: ShopClassification | null }
  | null;

const NO_SALE_REASON_VALUES: NoSaleReason[] = [
  "price",
  "no_stock_need",
  "competitor",
  "no_cash",
  "not_requested",
  "delivery_problem",
  "owner_absent",
  "previous_complaint",
  "credit_issue",
  "other",
];

function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);
}

export function NewVisit() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [shop, setShop] = useState<ShopSelection>(null);
  const [gps, setGps] = useState<GpsPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [photoInside, setPhotoInside] = useState<File | null>(null);
  const [photoOutside, setPhotoOutside] = useState<File | null>(null);
  const [outcome, setOutcome] = useState<"sold" | "no_sale" | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [finalAmount, setFinalAmount] = useState("");
  const [finalAmountTouched, setFinalAmountTouched] = useState(false);
  const [noSaleReason, setNoSaleReason] = useState<NoSaleReason | "">("");
  const [noSaleNote, setNoSaleNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    requestGps();
  }, []);

  useEffect(() => {
    if (!finalAmountTouched) {
      const total = cartTotal(cartItems);
      setFinalAmount(total > 0 ? String(total) : "");
    }
  }, [cartItems, finalAmountTouched]);

  function requestGps() {
    setGpsLoading(true);
    setGpsError(null);
    getCurrentPosition()
      .then(setGps)
      .catch((err) => setGpsError(err.message))
      .finally(() => setGpsLoading(false));
  }

  const finalAmountNumber = Number(finalAmount);
  const canSubmit =
    !!shop &&
    !!gps &&
    !!photoInside &&
    !!photoOutside &&
    ((outcome === "sold" &&
      (cartItems.length > 0 || orderNotes.trim() !== "") &&
      finalAmount.trim() !== "" &&
      !Number.isNaN(finalAmountNumber) &&
      finalAmountNumber > 0) ||
      (outcome === "no_sale" && noSaleReason !== ""));

  async function handleSubmit() {
    if (!canSubmit || !profile || !gps || !photoInside || !photoOutside || !shop) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      let shopId: string;
      if ("isNew" in shop) {
        const { data: createdShop, error: shopError } = await supabase
          .from("shops")
          .insert({
            shop_name: shop.shop_name,
            shop_number: shop.shop_number,
            lat: gps.lat,
            lng: gps.lng,
            classification: shop.classification ?? null,
            created_by: profile.id,
          })
          .select()
          .single();
        if (shopError || !createdShop) throw new Error(shopError?.message ?? t("newVisit.couldNotCreateShop"));
        shopId = createdShop.id;
      } else {
        shopId = shop.id;
      }

      const visitId = crypto.randomUUID();
      const insidePath = `${profile.id}/${visitId}/inside.jpg`;
      const outsidePath = `${profile.id}/${visitId}/outside.jpg`;

      const [insideUpload, outsideUpload] = await Promise.all([
        supabase.storage.from("visit-photos").upload(insidePath, photoInside, { contentType: "image/jpeg" }),
        supabase.storage.from("visit-photos").upload(outsidePath, photoOutside, { contentType: "image/jpeg" }),
      ]);
      if (insideUpload.error) throw insideUpload.error;
      if (outsideUpload.error) throw outsideUpload.error;

      if (outcome === "sold") {
        const { error: rpcError } = await supabase.rpc("create_sale_visit", {
          p_visit_id: visitId,
          p_shop_id: shopId,
          p_photo_inside_url: insidePath,
          p_photo_outside_url: outsidePath,
          p_gps_lat: gps.lat,
          p_gps_lng: gps.lng,
          p_items: cartItems.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
          p_final_amount: finalAmountNumber,
          p_order_notes: orderNotes.trim() || null,
        });
        if (rpcError) throw rpcError;
      } else {
        const { error: visitError } = await supabase.from("visits").insert({
          id: visitId,
          rep_id: profile.id,
          shop_id: shopId,
          photo_inside_url: insidePath,
          photo_outside_url: outsidePath,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
          outcome: "no_sale",
          no_sale_reason: noSaleReason as NoSaleReason,
          no_sale_note: noSaleNote.trim() || null,
        });
        if (visitError) throw visitError;
      }

      navigate("/my-visits", { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("newVisit.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">{t("newVisit.title")}</h1>
      </header>

      <div className="space-y-6 p-4">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("newVisit.stepShop")}
          </h2>
          <ShopPicker selected={shop} onSelect={setShop} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("newVisit.stepLocation")}
          </h2>
          {gpsLoading && <p className="text-sm text-gray-500">{t("newVisit.gettingLocation")}</p>}
          {gps && !gpsLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <MapPin className="h-5 w-5 shrink-0" />
              {t("newVisit.locationCaptured", { accuracy: Math.round(gps.accuracy) })}
            </div>
          )}
          {gpsError && !gpsLoading && (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                {t(gpsError)}
              </div>
              <button type="button" onClick={requestGps} className="font-semibold underline">
                {t("newVisit.tryAgain")}
              </button>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("newVisit.stepPhotos")}
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <PhotoCapture label={t("newVisit.photoInside")} onCaptured={setPhotoInside} />
            <PhotoCapture label={t("newVisit.photoOutside")} onCaptured={setPhotoOutside} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("newVisit.stepOutcome")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOutcome("sold")}
              className={`tap-target rounded-xl border-2 font-semibold ${
                outcome === "sold"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {t("newVisit.sold")}
            </button>
            <button
              type="button"
              onClick={() => setOutcome("no_sale")}
              className={`tap-target rounded-xl border-2 font-semibold ${
                outcome === "no_sale"
                  ? "border-red-600 bg-red-50 text-red-700"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {t("newVisit.noSale")}
            </button>
          </div>

          {outcome === "sold" && (
            <div className="mt-4 space-y-5">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">{t("newVisit.orderNotesTitle")}</h3>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder={t("newVisit.orderNotesPlaceholder")}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
                />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">{t("newVisit.catalogTitle")}</h3>
                <ProductPicker items={cartItems} onItemsChange={setCartItems} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="final-amount">
                  {t("newVisit.finalAmount")}
                </label>
                <input
                  id="final-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={finalAmount}
                  onChange={(e) => {
                    setFinalAmount(e.target.value);
                    setFinalAmountTouched(true);
                  }}
                  placeholder="0.00"
                  className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
                />
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-gray-400">{t("newVisit.finalAmountHint")}</p>
                  {finalAmountTouched && cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFinalAmountTouched(false)}
                      className="shrink-0 text-xs font-medium text-brand-600 underline"
                    >
                      {t("newVisit.resetToCartTotal")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {outcome === "no_sale" && (
            <div className="mt-4 space-y-3">
              <select
                value={noSaleReason}
                onChange={(e) => setNoSaleReason(e.target.value as NoSaleReason)}
                className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
              >
                <option value="">{t("newVisit.selectReason")}</option>
                {NO_SALE_REASON_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {t(`noSaleReasons.${value}`)}
                  </option>
                ))}
              </select>
              <textarea
                value={noSaleNote}
                onChange={(e) => setNoSaleNote(e.target.value)}
                placeholder={t("newVisit.optionalNote")}
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
              />
            </div>
          )}
        </section>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? t("newVisit.submitting") : t("newVisit.submit")}
        </Button>
      </div>
    </div>
  );
}
