import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { PhotoThumb } from "@/components/PhotoThumb";
import { defaultIcon } from "@/lib/leafletIcon";
import type { Invoice, Profile, Shop, Visit } from "@/types/database";

export function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [rep, setRep] = useState<Profile | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("visits")
      .select("*")
      .eq("id", id)
      .single()
      .then(async ({ data }) => {
        if (!data) return;
        setVisit(data);
        const [{ data: shopData }, { data: repData }] = await Promise.all([
          supabase.from("shops").select("*").eq("id", data.shop_id).single(),
          supabase.from("profiles").select("*").eq("id", data.rep_id).single(),
        ]);
        setShop(shopData ?? null);
        setRep(repData ?? null);
        if (data.outcome === "sold") {
          const { data: invoiceData } = await supabase
            .from("invoices")
            .select("*")
            .eq("visit_id", data.id)
            .single();
          setInvoice(invoiceData ?? null);
        }
      });
  }, [id]);

  if (!visit || !shop || !rep) return <FullScreenLoader />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to={`/dashboard/reps/${rep.id}`} className="text-sm text-brand-700">
        ← Back to {rep.full_name}
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{shop.shop_name}</h2>
            <p className="text-sm text-gray-500">#{shop.shop_number}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              visit.outcome === "sold" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {visit.outcome === "sold" ? "Sold" : "No sale"}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-400">Rep</dt>
            <dd className="font-medium text-gray-900">{rep.full_name}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Visit time</dt>
            <dd className="font-medium text-gray-900">{new Date(visit.visit_time).toLocaleString()}</dd>
          </div>
          {visit.outcome === "sold" ? (
            <div>
              <dt className="text-gray-400">Invoice</dt>
              <dd className="font-medium text-gray-900">
                {invoice ? `#${invoice.invoice_number} · ${invoice.amount}` : "Pending"}
              </dd>
            </div>
          ) : (
            <>
              <div>
                <dt className="text-gray-400">Reason</dt>
                <dd className="font-medium text-gray-900">{visit.no_sale_reason}</dd>
              </div>
              {visit.no_sale_note && (
                <div className="col-span-2">
                  <dt className="text-gray-400">Note</dt>
                  <dd className="font-medium text-gray-900">{visit.no_sale_note}</dd>
                </div>
              )}
            </>
          )}
        </dl>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Inside</p>
            <PhotoThumb path={visit.photo_inside_url} alt="Inside" className="h-48 w-full rounded-lg" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Outside</p>
            <PhotoThumb path={visit.photo_outside_url} alt="Outside" className="h-48 w-full rounded-lg" />
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-1 text-xs font-semibold uppercase text-gray-400">GPS location</p>
          <div className="h-56 overflow-hidden rounded-lg">
            <MapContainer
              center={[Number(visit.gps_lat), Number(visit.gps_lng)]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[Number(visit.gps_lat), Number(visit.gps_lng)]} icon={defaultIcon} />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
