import { errorMessage } from "../../lib/errors";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Boxes, Phone, PhoneCall, TrendingUp } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { fetchMyTelesalesStats, type MyTelesalesStats } from "../../lib/dashboard";
import { fetchMyCalls } from "../../lib/calls";
import type { Call } from "../../lib/types";
import { formatDateTime } from "../../lib/format";

export default function TelesalesDashboard() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<MyTelesalesStats | null>(null);
  const [recent, setRecent] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    Promise.all([fetchMyTelesalesStats(profile.id), fetchMyCalls(profile.id)])
      .then(([s, calls]) => {
        if (!alive) return;
        setStats(s);
        setRecent(calls.slice(0, 6));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [profile]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">
            {t("dashboard.telesales.welcome", { name: profile?.full_name })}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">{t("dashboard.telesales.subtitle")}</p>
        </div>
        <Link
          to="/calls/new"
          className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <PhoneCall size={16} /> {t("calls.newCall")}
        </Link>
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        <div className="grid grid-cols-3 gap-4">
          <StatTile
            icon={Phone}
            label={t("dashboard.telesales.statCalls")}
            value={loading ? "…" : String(stats?.callsMade ?? 0)}
          />
          <StatTile
            icon={TrendingUp}
            label={t("dashboard.telesales.statOrders")}
            value={loading ? "…" : String(stats?.ordersPlaced ?? 0)}
          />
          <StatTile
            icon={Boxes}
            label={t("dashboard.telesales.statBouquets")}
            value={loading ? "…" : String(stats?.bouquets ?? 0)}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-sea-800">{t("dashboard.telesales.recentCalls")}</h2>
            <Link to="/calls" className="text-xs font-semibold text-teal-700 hover:underline">
              {t("common.seeAll")}
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">{t("common.loading")}</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-gray-400">{t("dashboard.telesales.noCallsYet")}</p>
          ) : (
            <div className="flex flex-col">
              {recent.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border-t border-gray-100 py-2.5 first:border-t-0"
                >
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{c.account?.name ?? ""}</span>
                    <span className="ms-2 text-xs text-gray-400" dir="ltr">
                      {formatDateTime(c.created_at)}
                    </span>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10.5px] font-bold text-gray-500">
                    {t(`callOutcome.${c.outcome}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon size={15} />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-sea-800" dir="ltr">
        {value}
      </div>
    </div>
  );
}
