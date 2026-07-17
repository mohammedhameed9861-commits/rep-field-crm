import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { PhotoThumb } from "@/components/PhotoThumb";
import { defaultIcon } from "@/lib/leafletIcon";
import type { Invoice, OrderItem, Profile, Shop, Visit } from "@/types/database";

type OrderItemRow = OrderItem & { products: { name: string } | null };

export function VisitDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [rep, setRep] = useState<Profile | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

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
          const [{ data: invoiceData }, { data: itemsData }] = await Promise.all([
            supabase.from("invoices").select("*").eq("visit_id", data.id).single(),
            supabase.from("order_items").select("*, products(name)").eq("visit_id", data.id),
          ]);
          setInvoice(invoiceData ?? null);
          setOrderItems((itemsData as OrderItemRow[]) ?? []);
        }
      });
  }, [id]);

  if (!visit || !shop || !rep) return <FullScreenLoader />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to={`/dashboard/reps/${rep.id}`} className="flex items-center gap-1 text-sm text-brand-700">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("visitDetail.backTo", { name: rep.full_name })}
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{shop.shop_name}</h2>
            {shop.shop_number && <p className="text-sm text-gray-500">#{shop.shop_number}</p>}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              visit.outcome === "sold" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {visit.outcome === "sold" ? t("common.sold") : t("common.noSale")}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-400">{t("visitDetail.rep")}</dt>
            <dd className="font-medium text-gray-900">{rep.full_name}</dd>
          </div>
          <div>
            <dt className="text-gray-400">{t("visitDetail.visitTime")}</dt>
            <dd className="font-medium text-gray-900">{new Date(visit.visit_time).toLocaleString()}</dd>
          </div>
          {visit.outcome === "sold" ? (
            <div>
              <dt className="text-gray-400">{t("visitDetail.invoice")}</dt>
              <dd className="font-medium text-gray-900">
                {invoice ? `#${invoice.invoice_number} · ${invoice.amount}` : t("visitDetail.invoicePending")}
              </dd>
            </div>
          ) : (
            <>
              <div>
                <dt className="text-gray-400">{t("visitDetail.reason")}</dt>
                <dd className="font-medium text-gray-900">
                  {visit.no_sale_reason && t(`noSaleReasons.${visit.no_sale_reason}`)}
                </dd>
              </div>
              {visit.no_sale_note && (
                <div className="col-span-2">
                  <dt className="text-gray-400">{t("visitDetail.note")}</dt>
                  <dd className="font-medium text-gray-900">{visit.no_sale_note}</dd>
                </div>
              )}
            </>
          )}
        </dl>

        {visit.outcome === "sold" && visit.order_notes && (
          <div className="mt-5">
            <p className="mb-1 text-xs font-semibold uppercase text-gray-400">{t("newVisit.orderNotesTitle")}</p>
            <p className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
              {visit.order_notes}
            </p>
          </div>
        )}

        {visit.outcome === "sold" && orderItems.length > 0 && (
          <div className="mt-5">
            <p className="mb-1 text-xs font-semibold uppercase text-gray-400">{t("visitDetail.items")}</p>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-start text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2">{t("products.name")}</th>
                    <th className="px-3 py-2">{t("visitDetail.quantity")}</th>
                    <th className="px-3 py-2">{t("visitDetail.unitPrice")}</th>
                    <th className="px-3 py-2">{t("visitDetail.lineTotal")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {item.products?.name ?? item.custom_name}
                      </td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{item.unit_price.toLocaleString()}</td>
                      <td className="px-3 py-2">{item.line_total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-gray-400">{t("visitDetail.inside")}</p>
            <PhotoThumb path={visit.photo_inside_url} alt={t("visitDetail.inside")} className="h-48 w-full rounded-lg" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-gray-400">{t("visitDetail.outside")}</p>
            <PhotoThumb path={visit.photo_outside_url} alt={t("visitDetail.outside")} className="h-48 w-full rounded-lg" />
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-1 text-xs font-semibold uppercase text-gray-400">{t("visitDetail.gpsLocation")}</p>
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
