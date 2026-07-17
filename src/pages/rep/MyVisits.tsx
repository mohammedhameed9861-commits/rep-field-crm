import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Visit } from "@/types/database";

type VisitRow = Visit & { shops: { shop_name: string; shop_number: string | null } | null };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function MyVisits() {
  const { t } = useTranslation();
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

  const todayStats = useMemo(() => {
    if (!visits) return { achieved: 0, completed: 0 };
    const today = startOfToday();
    const todaysVisits = visits.filter((v) => new Date(v.visit_time) >= today);
    const achieved = todaysVisits
      .filter((v) => v.outcome === "sold")
      .reduce((sum, v) => sum + Number(v.sale_amount ?? 0), 0);
    return { achieved, completed: todaysVisits.length };
  }, [visits]);

  if (!visits || !profile) return <FullScreenLoader />;

  const target = profile.daily_target;
  const remaining = target != null ? Math.max(0, target - todayStats.achieved) : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{t("myVisits.title")}</h1>
          <p className="text-sm text-gray-500">{profile.full_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="p-2 text-gray-400" />
          <button onClick={signOut} className="p-2 text-gray-400" aria-label={t("common.signOut")}>
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <p className="text-xs text-gray-400">{t("myVisits.achieved")}</p>
          <p className="text-lg font-bold text-gray-900">{todayStats.achieved.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <p className="text-xs text-gray-400">{t("myVisits.remaining")}</p>
          <p className="text-lg font-bold text-gray-900">
            {remaining != null ? remaining.toLocaleString() : t("myVisits.noTarget")}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <p className="text-xs text-gray-400">{t("myVisits.completedVisits")}</p>
          <p className="text-lg font-bold text-gray-900">{todayStats.completed}</p>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        {visits.length === 0 && <p className="text-center text-gray-400">{t("myVisits.noVisits")}</p>}
        {visits.map((visit) => (
          <div key={visit.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{visit.shops?.shop_name}</p>
                {visit.shops?.shop_number && <p className="text-sm text-gray-500">#{visit.shops.shop_number}</p>}
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  visit.outcome === "sold" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {visit.outcome === "sold" ? `${t("common.sold")} · ${visit.sale_amount}` : t("common.noSale")}
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
          <Button>{t("myVisits.logNewVisit")}</Button>
        </Link>
      </div>
    </div>
  );
}
