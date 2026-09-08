import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { fetchAllCalls } from "../../lib/calls";
import { fetchStaff } from "../../lib/reps";
import type { Call, CallOutcome, Profile } from "../../lib/types";
import { formatDateTime } from "../../lib/format";
import DateRangePicker from "../../components/DateRangePicker";
import EditHistoryButton from "../../components/EditHistoryButton";
import EditCallModal from "../calls/EditCallModal";

const OUTCOME_BADGE: Record<CallOutcome, string> = {
  order_placed: "bg-teal-50 text-teal-700",
  follow_up: "bg-warn-100 text-warn-600",
  no_answer: "bg-gray-100 text-gray-500",
};

export default function TelesalesRollupPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const [agents, setAgents] = useState<Profile[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agentId, setAgentId] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [editingCall, setEditingCall] = useState<Call | null>(null);

  async function reloadCalls() {
    setLoading(true);
    try {
      setCalls(
        await fetchAllCalls({
          telesalesId: agentId || undefined,
          outcome: outcome || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profile?.role !== "manager") return;
    fetchStaff()
      .then((staff) => setAgents(staff.filter((p) => p.role === "telesales")))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [profile]);

  useEffect(() => {
    if (profile?.role !== "manager") return;
    void reloadCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, agentId, outcome, dateFrom, dateTo]);

  if (profile?.role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        {t("telesalesRollup.managerOnly")}
      </div>
    );
  }

  const field =
    "rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-7 pb-4 pt-6">
        <h1 className="text-xl font-bold text-sea-800">{t("telesalesRollup.title")}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {t(calls.length === 1 ? "telesalesRollup.countOne" : "telesalesRollup.countOther", {
            count: calls.length,
          })}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 px-7 pb-3">
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={field}>
          <option value="">{t("telesalesRollup.allAgents")}</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as CallOutcome | "")}
          className={field}
        >
          <option value="">{t("telesalesRollup.allOutcomes")}</option>
          <option value="order_placed">{t("callOutcome.order_placed")}</option>
          <option value="follow_up">{t("callOutcome.follow_up")}</option>
          <option value="no_answer">{t("callOutcome.no_answer")}</option>
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
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[130px_120px_1fr_110px_1fr_140px] gap-2 border-b border-gray-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <span>{t("telesalesRollup.colDate")}</span>
            <span>{t("telesalesRollup.colAgent")}</span>
            <span>{t("telesalesRollup.colShop")}</span>
            <span>{t("telesalesRollup.colOutcome")}</span>
            <span>{t("telesalesRollup.colNote")}</span>
            <span className="text-end">{t("reps.colActions")}</span>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-gray-400">{t("common.loading")}</p>
          ) : calls.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t("telesalesRollup.noCallsFound")}</p>
          ) : (
            calls.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[130px_120px_1fr_110px_1fr_140px] items-center gap-2 border-t border-gray-100 px-4 py-2.5"
              >
                <span className="text-xs text-gray-600" dir="ltr">
                  {formatDateTime(c.created_at)}
                </span>
                <span className="truncate text-xs font-semibold text-gray-900">
                  {c.telesales?.full_name ?? "—"}
                </span>
                <Link
                  to={`/accounts/${c.account_id}`}
                  className="truncate text-xs font-semibold text-teal-700 hover:underline"
                >
                  {c.account?.name ?? "—"}
                </Link>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] font-bold ${OUTCOME_BADGE[c.outcome]}`}
                  >
                    {t(`callOutcome.${c.outcome}`)}
                  </span>
                  {c.updated_at && (
                    <span className="text-[10.5px] font-semibold text-gray-400">
                      ({t("editHistory.edited")})
                    </span>
                  )}
                </div>
                <span className="truncate text-xs text-gray-500">{c.note ?? "—"}</span>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => setEditingCall(c)}
                    className="flex items-center gap-1 text-[10.5px] font-semibold text-gray-400 hover:text-teal-700"
                  >
                    <Pencil size={11} /> {t("editHistory.edit")}
                  </button>
                  <EditHistoryButton
                    tableName="calls"
                    recordId={c.id}
                    fields={[
                      { key: "outcome", label: t("editHistory.fieldOutcome") },
                      { key: "note", label: t("editHistory.fieldNote") },
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editingCall && (
        <EditCallModal
          call={editingCall}
          onClose={() => setEditingCall(null)}
          onSaved={() => {
            setEditingCall(null);
            void reloadCalls();
          }}
        />
      )}
    </div>
  );
}
