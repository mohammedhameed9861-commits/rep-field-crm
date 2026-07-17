import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import type { Visit } from "@/types/database";

type VisitRow = Visit & { shops: { shop_name: string; shop_number: string } | null };

export function MyVisits() {
  const { profile, signOut } = useAuth();
  const [visits, setVisits] = useState<VisitRow[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("visits")
      .select("*, shops(shop_name, shop_number)")
      .eq("rep_id", profile.id)
      .order("visit_time", { ascending: false })
      .then(({ data }) => setVisits((data as VisitRow[]) ?? []));
  }, [profile]);

  if (!visits) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">My Visits</h1>
          <p className="text-sm text-gray-500">{profile?.full_name}</p>
        </div>
        <button onClick={signOut} className="p-2 text-gray-400" aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <div className="space-y-3 p-4">
        {visits.length === 0 && <p className="text-center text-gray-400">No visits logged yet.</p>}
        {visits.map((visit) => (
          <div key={visit.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{visit.shops?.shop_name}</p>
                <p className="text-sm text-gray-500">#{visit.shops?.shop_number}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  visit.outcome === "sold" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {visit.outcome === "sold" ? `Sold · ${visit.sale_amount}` : "No sale"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <MapPin className="h-3 w-3" />
              {new Date(visit.visit_time).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
        <Link to="/visit/new">
          <Button>Log new visit</Button>
        </Link>
      </div>
    </div>
  );
}
