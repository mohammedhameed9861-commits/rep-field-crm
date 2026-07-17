import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import { defaultIcon } from "@/lib/leafletIcon";
import type { Shop } from "@/types/database";

export function Shops() {
  const { t } = useTranslation();
  const [shops, setShops] = useState<Shop[] | null>(null);

  useEffect(() => {
    supabase
      .from("shops")
      .select("*")
      .order("shop_name")
      .then(({ data }) => setShops(data ?? []));
  }, []);

  if (!shops) return <FullScreenLoader />;

  const withCoords = shops.filter((s) => s.lat != null && s.lng != null);
  const center: [number, number] = withCoords.length
    ? [Number(withCoords[0].lat), Number(withCoords[0].lng)]
    : [0, 0];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t("shops.title")}</h2>

      {withCoords.length > 0 && (
        <div className="h-80 overflow-hidden rounded-xl border border-gray-200">
          <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {withCoords.map((shop) => (
              <Marker key={shop.id} position={[Number(shop.lat), Number(shop.lng)]} icon={defaultIcon}>
                <Popup>
                  <Link to={`/dashboard/shops/${shop.id}`} className="font-semibold">
                    {shop.shop_name}
                  </Link>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {shops.map((shop) => (
          <Link
            key={shop.id}
            to={`/dashboard/shops/${shop.id}`}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="font-medium text-gray-900">{shop.shop_name}</p>
              <p className="text-sm text-gray-500">#{shop.shop_number}</p>
            </div>
            <ClassificationBadge classification={shop.classification} />
          </Link>
        ))}
        {shops.length === 0 && <p className="p-4 text-gray-400">{t("shops.noShopsYet")}</p>}
      </div>
    </div>
  );
}
