import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { fetchAllVisits, visitPhotoUrl } from "../../lib/visits";
import { fetchStaff } from "../../lib/reps";
import type { Profile, Visit, VisitOutcome } from "../../lib/types";
import { formatDateTime } from "../../lib/format";
import DateRangePicker from "../../components/DateRangePicker";

export default function VisitsActivityPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const [reps, setReps] = useState<Profile[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [repId, setRepId] = useState("");
  const [outcome, setOutcome] = useState<VisitOutcome | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (profile?.role !== "manager") return;
    fetchStaff()
      .then((staff) => setReps(staff.filter((p) => p.role === "rep")))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
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

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

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
