import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Phone, Plus } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { fetchMyCalls } from "../../lib/calls";
import type { Call } from "../../lib/types";
import { formatDateTime } from "../../lib/format";
import UpcomingFollowUps from "../../components/UpcomingFollowUps";

const OUTCOME_BADGE: Record<Call["outcome"], string> = {
  order_placed: "bg-teal-50 text-teal-700",
  follow_up: "bg-warn-100 text-warn-600",
  no_answer: "bg-gray-100 text-gray-500",
};

export default function MyCallsPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    setLoading(true);
    fetchMyCalls(profile.id)
      .then((data) => alive && setCalls(data))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [profile]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">{t("calls.myCallsTitle")}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t(calls.length === 1 ? "calls.loggedOne" : "calls.loggedOther", { count: calls.length })}
          </p>
        </div>
        <Link
          to="/calls/new"
          className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <Plus size={16} /> {t("calls.newCall")}
        </Link>
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        {loading ? (
          <p className="text-sm text-gray-400">{t("common.loading")}</p>
        ) : calls.length === 0 ? (
          <p className="text-sm text-gray-400">{t("calls.noCallsYet")}</p>
        ) : (
          <>
            <UpcomingFollowUps items={calls} />
            <div className="flex flex-col gap-2">
            {calls.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum-100 text-plum-500">
                  <Phone size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {c.account?.name ?? ""}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${OUTCOME_BADGE[c.outcome]}`}
                    >
                      {t(`callOutcome.${c.outcome}`)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {c.account?.area ?? ""} &middot; <span dir="ltr">{formatDateTime(c.created_at)}</span>
                  </div>
                  {c.note && <div className="mt-1 text-xs text-gray-500">{c.note}</div>}
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
