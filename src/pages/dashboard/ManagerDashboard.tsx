import { errorMessage } from "../../lib/errors";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowDown, ArrowUp, Pencil, Truck, Users } from "lucide-react";
import {
  fetchInventoryAlertCounts,
  fetchLast7DaysSeries,
  fetchMonthTrend,
  fetchNeedsAttention,
  fetchSalesTeamMTD,
  fetchTodayActivityByStaff,
  fetchTopStats,
  type DaySeriesPoint,
  type InventoryAlertCounts,
  type MonthTrend,
  type NeedsAttentionCounts,
  type SalesTeamRow,
  type TodayActivityRow,
  type TopStats,
} from "../../lib/dashboard";
import { updateMonthlyTarget } from "../../lib/settings";
import SevenDayChart from "./SevenDayChart";

export default function ManagerDashboard() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<TopStats | null>(null);
  const [trend, setTrend] = useState<MonthTrend | null>(null);
  const [series, setSeries] = useState<DaySeriesPoint[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlertCounts>({ low: 0, critical: 0 });
  const [salesTeam, setSalesTeam] = useState<SalesTeamRow[]>([]);
  const [todayActivity, setTodayActivity] = useState<TodayActivityRow[]>([]);
  const [needsAttention, setNeedsAttention] = useState<NeedsAttentionCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);

  async function reload() {
    try {
      const [s, mt, sr, a, st, ta, na] = await Promise.all([
        fetchTopStats(),
        fetchMonthTrend(),
        fetchLast7DaysSeries(7),
        fetchInventoryAlertCounts(),
        fetchSalesTeamMTD(),
        fetchTodayActivityByStaff(),
        fetchNeedsAttention(),
      ]);
      setStats(s);
      setTrend(mt);
      setSeries(sr);
      setAlerts(a);
      setSalesTeam(st);
      setTodayActivity(ta);
      setNeedsAttention(na);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function saveTarget() {
    const value = Number(targetInput);
    if (!value || value <= 0) return;
    setSavingTarget(true);
    try {
      await updateMonthlyTarget(value);
      setEditingTarget(false);
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingTarget(false);
    }
  }

  const today = new Date().toLocaleDateString(i18n.language === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const mtd = stats?.mtdSales ?? 0;
  const target = stats?.targetCartons ?? 0;
  const pct = target > 0 ? Math.min(100, (mtd / target) * 100) : 0;
  const remaining = Math.max(0, target - mtd);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - daysElapsed + 1);
  const requiredPerDay = remaining / daysRemaining;
  const currentPerDay = mtd / daysElapsed;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-7 pb-4 pt-6">
        <h1 className="text-xl font-bold text-sea-800">{t("dashboard.manager.title")}</h1>
        <span className="text-sm text-gray-500" dir="ltr">
          {today}
        </span>
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        {/* Top stat row */}
        <div className="grid grid-cols-5 gap-3">
          <MiniStat label={t("dashboard.manager.salesToday")} value={loading ? "…" : stats?.salesToday ?? 0} />
          <MiniStat
            label={t("dashboard.manager.mtdSales")}
            value={loading ? "…" : mtd}
            trendPct={loading ? undefined : trend?.pctChange}
          />
          <MiniStat label={t("dashboard.manager.target")} value={loading ? "…" : target} />
          <MiniStat
            label={t("dashboard.manager.statAccounts")}
            value={loading ? "…" : stats?.activeAccounts ?? 0}
          />
          <MiniStat label={t("dashboard.manager.ordersToday")} value={loading ? "…" : stats?.ordersToday ?? 0} />
        </div>

        {/* Monthly target */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-sea-800">{t("dashboard.manager.monthlyTarget")}</h2>
            {!editingTarget && (
              <button
                onClick={() => {
                  setTargetInput(String(target));
                  setEditingTarget(true);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
              >
                <Pencil size={12} /> {t("common.edit")}
              </button>
            )}
          </div>

          {editingTarget ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                dir="ltr"
                autoFocus
              />
              <button
                onClick={() => void saveTarget()}
                disabled={savingTarget}
                className="rounded-full bg-teal-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
              >
                {savingTarget ? t("common.saving") : t("common.save")}
              </button>
              <button
                onClick={() => setEditingTarget(false)}
                className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-gray-700" dir="ltr">
                  {mtd} / {target} {t("dashboard.manager.cartons")}
                </span>
                <span className="text-sm font-bold text-teal-700" dir="ltr">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-gray-500">
                <span dir="ltr">
                  {t("dashboard.manager.remaining")}: {remaining.toFixed(1)}
                </span>
                <span dir="ltr">
                  {t("dashboard.manager.requiredPerDay")}: {requiredPerDay.toFixed(1)}
                </span>
                <span dir="ltr">
                  {t("dashboard.manager.currentPerDay")}: {currentPerDay.toFixed(1)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Chart + inventory alerts */}
        <div className="mt-4 grid grid-cols-[1fr_260px] gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-sea-800">{t("dashboard.manager.last7Days")}</h2>
            {loading ? (
              <p className="text-sm text-gray-400">{t("common.loading")}</p>
            ) : (
              <SevenDayChart series={series} />
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-sea-800">
              <AlertTriangle size={15} className="text-warn-600" /> {t("dashboard.manager.inventoryAlerts")}
            </h2>
            {loading ? (
              <p className="text-sm text-gray-400">{t("common.loading")}</p>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{t("inventory.status.low")}</span>
                  <span className="rounded-full bg-warn-100 px-2 py-0.5 font-bold text-warn-600" dir="ltr">
                    {alerts.low}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{t("inventory.status.critical")}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-600" dir="ltr">
                    {alerts.critical}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sales team */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-sea-800">
            <Truck size={15} className="text-gray-400" /> {t("dashboard.manager.salesTeam")}
          </h2>
          {loading ? (
            <p className="text-sm text-gray-400">{t("common.loading")}</p>
          ) : salesTeam.length === 0 ? (
            <p className="text-sm text-gray-400">{t("dashboard.manager.noSalesTeamYet")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {salesTeam.map((row) => (
                <div key={row.key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-900">
                    {row.key === "telesales" ? t("nav.telesales") : row.name}
                  </span>
                  <span className="font-semibold text-gray-500" dir="ltr">
                    {row.cartons} {t("dashboard.manager.cartons")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Needs attention + today's activity */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-sea-800">{t("dashboard.manager.needsAttention")}</h2>
            {loading || !needsAttention ? (
              <p className="text-sm text-gray-400">{t("common.loading")}</p>
            ) : (
              <div className="flex flex-col gap-2 text-xs text-gray-700">
                <p>
                  <span className="font-bold text-sea-800" dir="ltr">
                    {needsAttention.inactiveHighValue}
                  </span>{" "}
                  {t("dashboard.manager.inactiveHighValue")}
                </p>
                <p>
                  <span className="font-bold text-sea-800" dir="ltr">
                    {needsAttention.declining}
                  </span>{" "}
                  {t("dashboard.manager.declining")}
                </p>
                <p>
                  <span className="font-bold text-sea-800" dir="ltr">
                    {needsAttention.reactivation}
                  </span>{" "}
                  {t("dashboard.manager.reactivationOpportunities")}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-sea-800">
              <Users size={15} className="text-gray-400" /> {t("dashboard.manager.todaysActivity")}
            </h2>
            {loading ? (
              <p className="text-sm text-gray-400">{t("common.loading")}</p>
            ) : todayActivity.length === 0 ? (
              <p className="text-sm text-gray-400">{t("dashboard.manager.noActivityToday")}</p>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                {todayActivity.map((row) => (
                  <div key={row.key} className="flex items-center justify-between">
                    <span className="text-gray-900">
                      {row.key === "telesales" ? t("nav.telesales") : row.name}
                    </span>
                    <span className="font-semibold text-gray-500" dir="ltr">
                      {row.count} {t(`dashboard.manager.unit.${row.unit}`)} / {row.cartons}{" "}
                      {t("dashboard.manager.cartons")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  trendPct,
}: {
  label: string;
  value: number | string;
  /** Percentage change vs. the same point last month — omit to hide the trend badge. */
  trendPct?: number;
}) {
  const { t } = useTranslation();
  const isUp = (trendPct ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
      <div className="text-[10.5px] font-semibold text-gray-400">{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-lg font-bold text-sea-800" dir="ltr">
          {value}
        </span>
        {trendPct !== undefined && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              isUp ? "bg-teal-50 text-teal-700" : "bg-red-100 text-red-600"
            }`}
            dir="ltr"
            title={t("dashboard.manager.trendHint")}
          >
            {isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {Math.abs(trendPct).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
