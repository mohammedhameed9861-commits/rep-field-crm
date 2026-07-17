import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import type { Visit } from "@/types/database";

function startOfDay(offsetDays: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

function summarize(visits: Visit[], since: Date) {
  const inRange = visits.filter((v) => new Date(v.visit_time) >= since);
  const sales = inRange.filter((v) => v.outcome === "sold");
  const revenue = sales.reduce((sum, v) => sum + Number(v.sale_amount ?? 0), 0);
  return {
    visits: inRange.length,
    sales: sales.length,
    revenue,
    conversion: inRange.length ? (sales.length / inRange.length) * 100 : 0,
  };
}

function StatCard({ title, stats }: { title: string; stats: ReturnType<typeof summarize> }) {
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

  useEffect(() => {
    supabase
      .from("visits")
      .select("*")
      .gte("visit_time", startOfDay(30).toISOString())
      .then(({ data }) => setVisits(data ?? []));
  }, []);

  const today = useMemo(() => (visits ? summarize(visits, startOfDay(0)) : null), [visits]);
  const week = useMemo(() => (visits ? summarize(visits, startOfDay(7)) : null), [visits]);
  const month = useMemo(() => (visits ? summarize(visits, startOfDay(30)) : null), [visits]);

  if (!today || !week || !month) return <FullScreenLoader />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t("overview.title")}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title={t("overview.today")} stats={today} />
        <StatCard title={t("overview.last7Days")} stats={week} />
        <StatCard title={t("overview.last30Days")} stats={month} />
      </div>
    </div>
  );
}
