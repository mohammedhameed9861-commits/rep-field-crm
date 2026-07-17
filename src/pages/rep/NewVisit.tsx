import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getCurrentPosition, type GpsPosition } from "@/lib/geolocation";
import { ShopPicker } from "@/components/ShopPicker";
import { PhotoCapture } from "@/components/PhotoCapture";
import { Button } from "@/components/Button";
import type { NoSaleReason, Shop } from "@/types/database";

type ShopSelection = Shop | { shop_name: string; shop_number: string; isNew: true } | null;

const NO_SALE_REASONS: { value: NoSaleReason; label: string }[] = [
  { value: "price", label: "Price too high" },
  { value: "no_stock_need", label: "Doesn't need stock right now" },
  { value: "competitor", label: "Using a competitor" },
  { value: "closed", label: "Shop was closed" },
  { value: "owner_absent", label: "Owner/buyer not present" },
  { value: "other", label: "Other" },
];

export function NewVisit() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [shop, setShop] = useState<ShopSelection>(null);
  const [gps, setGps] = useState<GpsPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [photoInside, setPhotoInside] = useState<File | null>(null);
  const [photoOutside, setPhotoOutside] = useState<File | null>(null);
  const [outcome, setOutcome] = useState<"sold" | "no_sale" | null>(null);
  const [saleAmount, setSaleAmount] = useState("");
  const [noSaleReason, setNoSaleReason] = useState<NoSaleReason | "">("");
  const [noSaleNote, setNoSaleNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    requestGps();
  }, []);

  function requestGps() {
    setGpsLoading(true);
    setGpsError(null);
    getCurrentPosition()
      .then(setGps)
      .catch((err) => setGpsError(err.message))
      .finally(() => setGpsLoading(false));
  }

  const canSubmit =
    !!shop &&
    !!gps &&
    !!photoInside &&
    !!photoOutside &&
    ((outcome === "sold" && Number(saleAmount) > 0) ||
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
            created_by: profile.id,
          })
          .select()
          .single();
        if (shopError || !createdShop) throw new Error(shopError?.message ?? "Could not create shop");
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

      const { error: visitError } = await supabase.from("visits").insert({
        id: visitId,
        rep_id: profile.id,
        shop_id: shopId,
        photo_inside_url: insidePath,
        photo_outside_url: outsidePath,
        gps_lat: gps.lat,
        gps_lng: gps.lng,
        outcome: outcome!,
        sale_amount: outcome === "sold" ? Number(saleAmount) : null,
        no_sale_reason: outcome === "no_sale" ? (noSaleReason as NoSaleReason) : null,
        no_sale_note: outcome === "no_sale" ? noSaleNote.trim() || null : null,
      });
      if (visitError) throw visitError;

      navigate("/my-visits", { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">New Visit</h1>
      </header>

      <div className="space-y-6 p-4">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">1. Shop</h2>
          <ShopPicker selected={shop} onSelect={setShop} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">2. Location</h2>
          {gpsLoading && <p className="text-sm text-gray-500">Getting your location...</p>}
          {gps && !gpsLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <MapPin className="h-5 w-5 shrink-0" />
              Location captured (±{Math.round(gps.accuracy)}m)
            </div>
          )}
          {gpsError && !gpsLoading && (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                {gpsError}
              </div>
              <button type="button" onClick={requestGps} className="font-semibold underline">
                Try again
              </button>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">3. Photos</h2>
          <div className="grid grid-cols-1 gap-3">
            <PhotoCapture label="Photo inside" onCaptured={setPhotoInside} />
            <PhotoCapture label="Photo outside" onCaptured={setPhotoOutside} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">4. Outcome</h2>
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
              Sold
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
              No Sale
            </button>
          </div>

          {outcome === "sold" && (
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="amount">
                Invoice amount
              </label>
              <input
                id="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                placeholder="0.00"
                className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
              />
            </div>
          )}

          {outcome === "no_sale" && (
            <div className="mt-4 space-y-3">
              <select
                value={noSaleReason}
                onChange={(e) => setNoSaleReason(e.target.value as NoSaleReason)}
                className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
              >
                <option value="">Select a reason...</option>
                {NO_SALE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <textarea
                value={noSaleNote}
                onChange={(e) => setNoSaleNote(e.target.value)}
                placeholder="Optional note"
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
          {submitting ? "Submitting..." : "Submit visit"}
        </Button>
      </div>
    </div>
  );
}
