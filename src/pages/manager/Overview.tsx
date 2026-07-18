import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { computeRepAlerts, summarizeVisits, type PeriodSummary } from "@/lib/repStats";
import type { Profile, Visit } from "@/types/database";

function startOfDay(offsetDays: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

function StatCard({ title, stats }: { title: string; stats: PeriodSummary }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-gray-400">{t("overview.visits")}</dt>
          <dd className="text-2xl font-bold text-gray-900">{stats.visits}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">{t("overview.sales")}</dt>
          <dd className="text-2xl font-bold text-gray-900">{stats.sales}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">{t("overview.revenue")}</dt>
          <dd className="text-2xl font-bold text-gray-900">{stats.revenue.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">{t("overview.conversion")}</dt>
          <dd className="text-2xl font-bold text-gray-900">{stats.conversion.toFixed(0)}%</dd>
        </div>
      </dl>
    </div>
  );
}

export function Overview() {
  const { t } = useTranslation();
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [reps, setReps] = useState<Profile[] | null>(null);

  useEffect(() => {
    supabase
      .from("visits")
      .select("*")
      .gte("visit_time", startOfDay(30).toISOString())
      .then(({ data }) => setVisits(data ?? []));
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "rep")
      .eq("active", true)
      .then(({ data }) => setReps(data ?? []));
  }, []);

  const today = useMemo(() => (visits ? summarizeVisits(visits, startOfDay(0)) : null), [visits]);
  const week = useMemo(() => (visits ? summarizeVisits(visits, startOfDay(7)) : null), [visits]);
  const month = useMemo(() => (visits ? summarizeVisits(visits, startOfDay(30)) : null), [visits]);

  const alerts = useMemo(
    () => (visits && reps ? computeRepAlerts(reps, visits, startOfDay(0)) : []),
    [visits, reps],
  );

  if (!today || !week || !month || !reps) return <FullScreenLoader />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t("overview.title")}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title={t("overview.today")} stats={today} />
        <StatCard title={t("overview.last7Days")} stats={week} />
        <StatCard title={t("overview.last30Days")} stats={month} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{t("overview.alerts")}</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-400">{t("overview.noAlerts")}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {alerts.map((alert) => (
              <li key={`${alert.kind}-${alert.rep.id}`} className="flex items-center gap-2 py-2 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <Link to={`/dashboard/reps/${alert.rep.id}`} className="text-gray-800 hover:text-brand-700">
                  {alert.kind === "notStarted"
                    ? t("overview.alertNotStarted", { name: alert.rep.full_name })
                    : t("overview.alertBehindTarget", {
                        name: alert.rep.full_name,
                        achieved: alert.achieved?.toLocaleString(),
                        target: alert.rep.daily_target?.toLocaleString(),
                      })}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
