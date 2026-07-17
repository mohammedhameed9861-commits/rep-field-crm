import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import type { Shop, Visit } from "@/types/database";

type VisitRow = Visit & { profiles: { full_name: string } | null };

export function ShopDetail() {
  const { shopId } = useParams<{ shopId: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [visits, setVisits] = useState<VisitRow[] | null>(null);

  useEffect(() => {
    if (!shopId) return;
    supabase.from("shops").select("*").eq("id", shopId).single().then(({ data }) => setShop(data));
    supabase
      .from("visits")
      .select("*, profiles(full_name)")
      .eq("shop_id", shopId)
      .order("visit_time", { ascending: false })
      .then(({ data }) => setVisits((data as VisitRow[]) ?? []));
  }, [shopId]);

  if (!shop || !visits) return <FullScreenLoader />;

  return (
    <div className="space-y-4">
      <div>
        <Link to="/dashboard/shops" className="text-sm text-brand-700">
          ← Back to shops
        </Link>
        <h2 className="text-xl font-bold text-gray-900">{shop.shop_name}</h2>
        <p className="text-sm text-gray-500">
          #{shop.shop_number}
          {shop.lat != null && shop.lng != null && ` · ${shop.lat}, ${shop.lng}`}
        </p>
      </div>

      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {visits.map((visit) => (
          <Link
            key={visit.id}
            to={`/dashboard/visit/${visit.id}`}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="font-medium text-gray-900">{visit.profiles?.full_name}</p>
              <p className="text-xs text-gray-400">{new Date(visit.visit_time).toLocaleString()}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                visit.outcome === "sold" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {visit.outcome === "sold" ? `Sold · ${visit.sale_amount}` : "No sale"}
            </span>
          </Link>
        ))}
        {visits.length === 0 && <p className="p-4 text-gray-400">No visits logged for this shop yet.</p>}
      </div>
    </div>
  );
}
