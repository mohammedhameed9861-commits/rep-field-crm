import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { PhotoThumb } from "@/components/PhotoThumb";
import type { Profile, Visit } from "@/types/database";

type VisitRow = Visit & { shops: { shop_name: string; shop_number: string } | null };

export function RepDetail() {
  const { repId } = useParams<{ repId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [visits, setVisits] = useState<VisitRow[] | null>(null);

  useEffect(() => {
    if (!repId) return;
    supabase.from("profiles").select("*").eq("id", repId).single().then(({ data }) => setProfile(data));
    supabase
      .from("visits")
      .select("*, shops(shop_name, shop_number)")
      .eq("rep_id", repId)
      .order("visit_time", { ascending: false })
      .then(({ data }) => setVisits((data as VisitRow[]) ?? []));
  }, [repId]);

  if (!profile || !visits) return <FullScreenLoader />;

  return (
    <div className="space-y-4">
      <div>
        <Link to="/dashboard/reps" className="text-sm text-brand-700">
          ← Back to reps
        </Link>
        <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
        <p className="text-sm text-gray-500">{profile.phone ?? "No phone on file"}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visits.map((visit) => (
          <Link
            key={visit.id}
            to={`/dashboard/visit/${visit.id}`}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <div className="grid grid-cols-2">
              <PhotoThumb path={visit.photo_inside_url} alt="Inside" className="h-24 w-full" />
              <PhotoThumb path={visit.photo_outside_url} alt="Outside" className="h-24 w-full" />
            </div>
            <div className="p-3">
              <p className="font-medium text-gray-900">{visit.shops?.shop_name}</p>
              <p className="text-xs text-gray-400">{new Date(visit.visit_time).toLocaleString()}</p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  visit.outcome === "sold" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {visit.outcome === "sold" ? `Sold · ${visit.sale_amount}` : "No sale"}
              </span>
            </div>
          </Link>
        ))}
        {visits.length === 0 && <p className="text-gray-400">No visits logged yet.</p>}
      </div>
    </div>
  );
}
