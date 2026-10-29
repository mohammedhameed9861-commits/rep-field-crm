import { friendlyError } from "../../lib/errors";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Pencil, Truck, Users } from "lucide-react";
import {
  fetchGrowthMetrics,
  fetchLast7DaysSeries,
  fetchMonthOverview,
  fetchMonthTrend,
  fetchNeedsAttention,
  fetchSalesTeamMTD,
  fetchTodayActivityByStaff,
  fetchTopLists,
  fetchTopStats,
  NOT_ORDERING_DAYS,
  TOP_ITEMS_COUNT,
  TOP_SHOPS_COUNT,
  type DaySeriesPoint,
  type GrowthMetrics,
  type MonthOverview,
  type MonthTrend,
  type NeedsAttentionAccounts,
  type SalesTeamRow,
  type TodayActivityRow,
  type TopLists,
  type TopStats,
} from "../../lib/dashboard";
import { updateMonthlyTarget } from "../../lib/settings";
import SevenDayChart from "./SevenDayChart";

/** "YYYY-MM" for the current month in the user's own timezone (toISOString would give UTC). */
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ManagerDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<TopStats | null>(null);
  const [trend, setTrend] = useState<MonthTrend | null>(null);
  const [series, setSeries] = useState<DaySeriesPoint[]>([]);
  const [growth, setGrowth] = useState<GrowthMetrics | null>(null);
  const [salesTeam, setSalesTeam] = useState<SalesTeamRow[]>([]);
  const [todayActivity, setTodayActivity] = useState<TodayActivityRow[]>([]);
  const [needsAttention, setNeedsAttention] = useState<NeedsAttentionAccounts | null>(null);
  const [expandedAttention, setExpandedAttention] = useState<keyof NeedsAttentionAccounts | null>(null);
  const [topLists, setTopLists] = useState<TopLists | null>(null);
  const [topListsFailed, setTopListsFailed] = useState(false);
  const [overview, setOverview] = useState<MonthOverview | null>(null);
  const [overviewFailed, setOverviewFailed] = useState(false);
  const [topMonth, setTopMonth] = useState(currentMonth); // "YYYY-MM"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);

  async function reload() {
    try {
      const [s, mt, sr, g, st, ta, na] = await Promise.all([
        fetchTopStats(),
        fetchMonthTrend(),
        fetchLast7DaysSeries(7),
        fetchGrowthMetrics(30),
        fetchSalesTeamMTD(),
        fetchTodayActivityByStaff(),
        fetchNeedsAttention(),
      ]);
      setStats(s);
      setTrend(mt);
      setSeries(sr);
      setGrowth(g);
      setSalesTeam(st);
      setTodayActivity(ta);
      setNeedsAttention(na);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    const [y, m] = topMonth.split("-").map(Number);
    let alive = true;
    setTopListsFailed(false);
    fetchTopLists(new Date(y, m - 1, 1))
      .then((r) => alive && setTopLists(r))
      .catch(() => alive && setTopListsFailed(true));
    return () => {
      alive = false;
    };
  }, [topMonth]);

  // Separate from the top lists above: a missing migration (0026) must not hide them or vice versa.
  useEffect(() => {
    const [y, m] = topMonth.split("-").map(Number);
    let alive = true;
    setOverviewFailed(false);
    fetchMonthOverview(new Date(y, m - 1, 1))
      .then((r) => alive && setOverview(r))
      .catch(() => alive && setOverviewFailed(true));
    return () => {
      alive = false;
    };
  }, [topMonth]);

  async function saveTarget() {
    const value = Number(targetInput);
    if (!value || value <= 0) return;
    setSavingTarget(true);
    try {
      await updateMonthlyTarget(value);
      setEditingTarget(false);
      await reload();
    } catch (err) {
      setError(friendlyError(err));
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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 md:px-7 pb-4 pt-6">
        <h1 className="text-xl font-bold text-sea-800">{t("dashboard.manager.title")}</h1>
        <span className="text-sm text-gray-500" dir="ltr">
          {today}
        </span>
      </div>

      {error && <p className="px-4 md:px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-7 pb-6">
        {/* Top stat row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
                  {mtd} / {target} {t("dashboard.manager.bouquets")}
                </span>
                <span className="text-sm font-bold text-teal-700" dir="ltr">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs text-gray-500 sm:grid-cols-3 sm:gap-3">
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

        {/* Growth metrics */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-sea-800">{t("dashboard.manager.growth.title")}</h2>
            <span className="text-[11px] text-gray-400">{t("dashboard.manager.growth.window")}</span>
          </div>
          {loading || !growth ? (
            <p className="text-sm text-gray-400">{t("common.loading")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <GrowthStat
                label={t("dashboard.manager.growth.repeatPurchaseRate")}
                pct={growth.repeatPurchaseRate}
                hint={t("dashboard.manager.growth.repeatPurchaseHint", {
                  repeat: growth.repeatCustomers,
                  buying: growth.buyingCustomers,
                })}
              />
              <GrowthStat
                label={t("dashboard.manager.growth.conversionRate")}
                pct={growth.conversionRate}
                hint={t("dashboard.manager.growth.conversionHint", {
                  sold: growth.soldVisits,
                  total: growth.totalVisits,
                })}
              />
              <GrowthStat
                label={t("dashboard.manager.growth.activePenetration")}
                pct={growth.activePenetrationRate}
                hint={t("dashboard.manager.growth.activePenetrationHint", {
                  ordering: growth.orderingActiveShops,
                  total: growth.totalActiveShops,
                })}
              />
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-sea-800">{t("dashboard.manager.last7Days")}</h2>
          {loading ? (
            <p className="text-sm text-gray-400">{t("common.loading")}</p>
          ) : (
            <SevenDayChart series={series} />
          )}
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
                    {row.cartons} {t("dashboard.manager.bouquets")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top items / top shops / shops that stopped ordering. Needs migrations 0022 + 0023;
            fetched on its own so a dashboard that's live before the SQL is still usable. */}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <span>{t("dashboard.manager.topMonth")}</span>
          <input
            type="month"
            value={topMonth}
            max={currentMonth()}
            onChange={(e) => e.target.value && setTopMonth(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700"
            dir="ltr"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat
            label={t("dashboard.manager.avgPerOrder")}
            value={overview ? overview.avgPerOrder.toFixed(1) : overviewFailed ? "—" : "…"}
          />
          <MiniStat
            label={t("dashboard.manager.firstTimeBuyers")}
            value={overview ? overview.firstTime.length : overviewFailed ? "—" : "…"}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-sea-800">{t("dashboard.manager.salesByArea")}</h2>
            <div className="max-h-56 overflow-y-auto">
              <TopList
                state={overview ? "ready" : overviewFailed ? "failed" : "loading"}
                rows={(overview?.byArea ?? []).map((r) => ({
                  key: r.area || "—",
                  label: r.area || t("dashboard.manager.noArea"),
                  value: `${r.qty} ${t("dashboard.manager.bouquets")}`,
                }))}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-sea-800">{t("dashboard.manager.firstTimeBuyers")}</h2>
            <div className="max-h-56 overflow-y-auto">
              <TopList
                state={overview ? "ready" : overviewFailed ? "failed" : "loading"}
                rows={(overview?.firstTime ?? []).map((r) => ({
                  key: r.id,
                  label: r.name,
                  value: "",
                  onClick: () => navigate(`/accounts/${r.id}`),
                }))}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-sea-800">
              {t("dashboard.manager.topItems", { count: TOP_ITEMS_COUNT })}
            </h2>
            <div className="max-h-72 overflow-y-auto">
              <TopList
                state={topLists ? "ready" : topListsFailed ? "failed" : "loading"}
                rows={(topLists?.items ?? []).map((r) => ({
                  key: r.name,
                  label: r.name,
                  value: `${r.qty} ${t("dashboard.manager.bouquets")}`,
                }))}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-sea-800">
              {t("dashboard.manager.topShops", { count: TOP_SHOPS_COUNT })}
            </h2>
            <div className="max-h-72 overflow-y-auto">
            <TopList
              state={topLists ? "ready" : topListsFailed ? "failed" : "loading"}
              rows={(topLists?.shops ?? []).map((r) => ({
                key: r.id,
                label: r.name,
                value: `${r.qty} ${t("dashboard.manager.bouquets")}`,
                onClick: () => navigate(`/accounts/${r.id}`),
              }))}
            />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-sea-800">
              {t("dashboard.manager.notOrdering", { days: NOT_ORDERING_DAYS })}
              {topLists && topLists.notOrdering.length > 0 && (
                <span className="ms-1.5 text-gray-400" dir="ltr">
                  ({topLists.notOrdering.length})
                </span>
              )}
            </h2>
            <div className="max-h-56 overflow-y-auto">
              <TopList
                state={topLists ? "ready" : topListsFailed ? "failed" : "loading"}
                rows={(topLists?.notOrdering ?? []).map((r) => ({
                  key: r.id,
                  label: r.name,
                  value: t("dashboard.manager.daysAgo", { count: r.daysSince }),
                  onClick: () => navigate(`/accounts/${r.id}`),
                }))}
              />
            </div>
          </div>
        </div>

        {/* Needs attention + today's activity */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-sea-800">{t("dashboard.manager.needsAttention")}</h2>
            {loading || !needsAttention ? (
              <p className="text-sm text-gray-400">{t("common.loading")}</p>
            ) : (
              <div className="flex flex-col gap-1.5 text-xs text-gray-700">
                <NeedsAttentionRow
                  accounts={needsAttention.inactiveHighValue}
                  label={t("dashboard.manager.inactiveHighValue")}
                  expanded={expandedAttention === "inactiveHighValue"}
                  onToggle={() =>
                    setExpandedAttention(expandedAttention === "inactiveHighValue" ? null : "inactiveHighValue")
                  }
                  onGo={(accountId) => navigate(`/accounts/${accountId}`)}
                />
                <NeedsAttentionRow
                  accounts={needsAttention.declining}
                  label={t("dashboard.manager.declining")}
                  expanded={expandedAttention === "declining"}
                  onToggle={() => setExpandedAttention(expandedAttention === "declining" ? null : "declining")}
                  onGo={(accountId) => navigate(`/accounts/${accountId}`)}
                />
                <NeedsAttentionRow
                  accounts={needsAttention.reactivation}
                  label={t("dashboard.manager.reactivationOpportunities")}
                  expanded={expandedAttention === "reactivation"}
                  onToggle={() => setExpandedAttention(expandedAttention === "reactivation" ? null : "reactivation")}
                  onGo={(accountId) => navigate(`/accounts/${accountId}`)}
                />
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
                      {t("dashboard.manager.bouquets")}
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

/** One growth metric: a big percentage plus a plain-language hint of the underlying
 * counts (e.g. "6 of 14 shops") — a bare % is easy to misread, the raw numbers aren't. */
function GrowthStat({ label, pct, hint }: { label: string; pct: number; hint: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3.5">
      <div className="text-[10.5px] font-semibold text-gray-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-sea-800" dir="ltr">
        {pct.toFixed(0)}%
      </div>
      <div className="mt-0.5 text-[11px] text-gray-500">{hint}</div>
    </div>
  );
}

/** One "Needs Attention" line — clicking it jumps straight to the flagged account (when
 * there's only one) or, with several, expands an inline list to pick from. */
function NeedsAttentionRow({
  accounts,
  label,
  expanded,
  onToggle,
  onGo,
}: {
  accounts: { id: string; name: string }[];
  label: string;
  expanded: boolean;
  onToggle: () => void;
  onGo: (accountId: string) => void;
}) {
  if (accounts.length === 0) {
    return (
      <p>
        <span className="font-bold text-sea-800" dir="ltr">
          0
        </span>{" "}
        {label}
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => (accounts.length === 1 ? onGo(accounts[0].id) : onToggle())}
        className="flex items-center gap-1 text-start hover:underline"
      >
        <span className="font-bold text-sea-800" dir="ltr">
          {accounts.length}
        </span>
        <span>{label}</span>
      </button>
      {expanded && accounts.length > 1 && (
        <div className="mt-1 flex flex-col items-start gap-0.5 ps-1">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onGo(a.id)}
              className="text-teal-700 hover:underline"
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A short ranked list for the dashboard's top-lists row — the three states (loading, SQL not
 * run yet, real rows) share one component so each card stays a few lines. */
function TopList({
  state,
  rows,
}: {
  state: "loading" | "failed" | "ready";
  rows: { key: string; label: string; value: string; onClick?: () => void }[];
}) {
  const { t } = useTranslation();
  if (state === "loading") return <p className="text-sm text-gray-400">{t("common.loading")}</p>;
  if (state === "failed") return <p className="text-sm text-gray-400">{t("dashboard.manager.topListsUnavailable")}</p>;
  if (rows.length === 0) return <p className="text-sm text-gray-400">{t("dashboard.manager.nothingToShow")}</p>;
  return (
    <div className="flex flex-col gap-2 text-xs">
      {rows.map((r, i) => (
        <div key={r.key} className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="w-4 shrink-0 text-gray-400" dir="ltr">
              {i + 1}
            </span>
            {r.onClick ? (
              <button type="button" onClick={r.onClick} className="truncate text-start text-teal-700 hover:underline">
                {r.label}
              </button>
            ) : (
              <span className="truncate text-gray-900">{r.label}</span>
            )}
          </span>
          <span className="shrink-0 font-semibold text-gray-500" dir="ltr">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
