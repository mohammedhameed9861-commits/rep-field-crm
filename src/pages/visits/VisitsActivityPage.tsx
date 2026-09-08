import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { fetchAllVisits, visitPhotoUrl } from "../../lib/visits";
import { fetchStaff, setStaffTarget } from "../../lib/reps";
import { fetchRepPerformance, type RepPerformanceRow } from "../../lib/dashboard";
import type { Profile, Visit, VisitOutcome } from "../../lib/types";
import { formatDateTime } from "../../lib/format";
import DateRangePicker from "../../components/DateRangePicker";

export default function VisitsActivityPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const [reps, setReps] = useState<Profile[]>([]);
  const [performance, setPerformance] = useState<RepPerformanceRow[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [repId, setRepId] = useState("");
  const [outcome, setOutcome] = useState<VisitOutcome | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [editingTargetFor, setEditingTargetFor] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);

  async function reloadPerformance() {
    setPerformanceLoading(true);
    try {
      setPerformance(await fetchRepPerformance());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPerformanceLoading(false);
    }
  }

  useEffect(() => {
    if (profile?.role !== "manager") return;
    fetchStaff()
      .then((staff) => setReps(staff.filter((p) => p.role === "rep")))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    void reloadPerformance();
  }, [profile]);

  useEffect(() => {
    if (profile?.role !== "manager") return;
    let alive = true;
    setLoading(true);
    fetchAllVisits({
      repId: repId || undefined,
      outcome: outcome || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then(async (data) => {
        if (!alive) return;
        setVisits(data);
        const entries = await Promise.all(
          data.map(async (v) => [v.id, await visitPhotoUrl(v.photo_path)] as const),
        );
        if (alive) {
          setPhotos(Object.fromEntries(entries.filter(([, url]) => url)) as Record<string, string>);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [profile, repId, outcome, dateFrom, dateTo]);

  async function saveTarget(repIdToSave: string) {
    const value = Number(targetInput);
    if (!value || value <= 0) return;
    setSavingTarget(true);
    try {
      await setStaffTarget(repIdToSave, value);
      setEditingTargetFor(null);
      await reloadPerformance();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingTarget(false);
    }
  }

  if (profile?.role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        {t("visitsActivity.managerOnly")}
      </div>
    );
  }

  const field =
    "rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-7 pb-4 pt-6">
        <h1 className="text-xl font-bold text-sea-800">{t("visitsActivity.title")}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {t(visits.length === 1 ? "visitsActivity.countOne" : "visitsActivity.countOther", {
            count: visits.length,
          })}
        </p>
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="shrink-0 px-7 pb-4">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[1fr_90px_90px_100px_90px_130px] gap-2 border-b border-gray-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <span>{t("visitsActivity.colRep")}</span>
            <span>{t("visitsActivity.colBouquetsMTD")}</span>
            <span>{t("visitsActivity.colOrdersMTD")}</span>
            <span>{t("visitsActivity.colActiveAccounts")}</span>
            <span>{t("visitsActivity.colVisitsToday")}</span>
            <span>{t("visitsActivity.colAchievement")}</span>
          </div>
          {performanceLoading ? (
            <p className="p-4 text-sm text-gray-400">{t("common.loading")}</p>
          ) : performance.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t("visitsActivity.noRepsYet")}</p>
          ) : (
            performance.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_90px_90px_100px_90px_130px] items-center gap-2 border-t border-gray-100 px-4 py-2.5"
              >
                <span className="truncate text-sm font-semibold text-gray-900">{r.name}</span>
                <span className="text-sm text-gray-700" dir="ltr">
                  {r.bouquetsMTD}
                </span>
                <span className="text-sm text-gray-700" dir="ltr">
                  {r.ordersMTD}
                </span>
                <span className="text-sm text-gray-700" dir="ltr">
                  {r.activeAccounts}
                </span>
                <span className="text-sm text-gray-700" dir="ltr">
                  {r.visitsToday}
                </span>
                {editingTargetFor === r.id ? (
                  <div className="flex items-center gap-1" dir="ltr">
                    <input
                      type="number"
                      min="1"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      className="w-16 rounded border border-gray-200 px-1.5 py-1 text-xs outline-none focus:border-teal-400"
                      autoFocus
                    />
                    <button
                      onClick={() => void saveTarget(r.id)}
                      disabled={savingTarget}
                      className="rounded bg-teal-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
                    >
                      {t("common.save")}
                    </button>
                  </div>
                ) : r.target ? (
                  <button
                    onClick={() => {
                      setEditingTargetFor(r.id);
                      setTargetInput(String(r.target));
                    }}
                    className="flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold hover:opacity-80"
                    style={{
                      backgroundColor: (r.achievementPct ?? 0) >= 100 ? "#e7fbfa" : "#fdf1e7",
                      color: (r.achievementPct ?? 0) >= 100 ? "#188f88" : "#b8551f",
                    }}
                    dir="ltr"
                  >
                    {r.achievementPct?.toFixed(0)}%
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingTargetFor(r.id);
                      setTargetInput("");
                    }}
                    className="flex w-fit items-center gap-1 text-[10.5px] font-semibold text-gray-400 hover:text-teal-700"
                  >
                    <Pencil size={10} /> {t("visitsActivity.setTarget")}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-7 pb-3">
        <select value={repId} onChange={(e) => setRepId(e.target.value)} className={field}>
          <option value="">{t("visitsActivity.allReps")}</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as VisitOutcome | "")}
          className={field}
        >
          <option value="">{t("visitsActivity.allOutcomes")}</option>
          <option value="sold">{t("visits.sold")}</option>
          <option value="no_sale">{t("visits.noSale")}</option>
        </select>
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={(f, tt) => {
            setDateFrom(f);
            setDateTo(tt);
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        {loading ? (
          <p className="text-sm text-gray-400">{t("common.loading")}</p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-gray-400">{t("visitsActivity.noVisitsFound")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visits.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3"
              >
                {photos[v.id] ? (
                  <img
                    src={photos[v.id]}
                    alt={v.account?.name ?? ""}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/accounts/${v.account_id}`}
                      className="truncate text-sm font-semibold text-teal-700 hover:underline"
                    >
                      {v.account?.name ?? "—"}
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                        v.outcome === "sold" ? "bg-teal-50 text-teal-700" : "bg-warn-100 text-warn-600"
                      }`}
                    >
                      {v.outcome === "sold" ? t("visits.sold") : t("visits.noSale")}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    <span className="font-semibold text-gray-600">{v.rep?.full_name ?? "—"}</span> &middot;{" "}
                    <span dir="ltr">{formatDateTime(v.created_at)}</span>
                  </div>
                  {v.note && <div className="mt-1 text-xs text-gray-500">{v.note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
