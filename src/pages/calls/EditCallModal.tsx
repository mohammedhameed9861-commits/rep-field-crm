import { errorMessage } from "../../lib/errors";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { updateCall } from "../../lib/calls";
import type { Call, CallOutcome, CallReason, CallType } from "../../lib/types";
import FollowUpPicker from "../../components/FollowUpPicker";

const CALL_TYPES: CallType[] = ["new_customer", "reactivation", "follow_up"];
const OUTCOMES: CallOutcome[] = ["interested_callback", "not_interested", "order_placed", "no_answer"];
const INTEREST_REASONS: CallReason[] = [
  "wants_price",
  "wants_availability",
  "wants_specific_flower",
  "waiting_next_purchase",
  "needs_owner_approval",
  "other",
];
const NOT_INTERESTED_REASONS: CallReason[] = [
  "price_too_high",
  "bought_competitor",
  "no_current_demand",
  "quality_concern",
  "doesnt_want_change_supplier",
  "other",
];

export default function EditCallModal({
  call,
  onClose,
  onSaved,
}: {
  call: Call;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [callType, setCallType] = useState<CallType | "">(call.call_type ?? "");
  const [outcome, setOutcome] = useState<CallOutcome>(call.outcome);
  const [callReason, setCallReason] = useState<CallReason | "">(call.call_reason ?? "");
  const [note, setNote] = useState(call.note ?? "");
  const [nextFollowupAt, setNextFollowupAt] = useState<string | null>(call.next_followup_at);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectOutcome(o: CallOutcome) {
    setOutcome(o);
    if (o !== "interested_callback" && o !== "not_interested") setCallReason("");
    if (o !== "interested_callback") setNextFollowupAt(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (outcome === "not_interested" && !callReason) return;
    setBusy(true);
    setError(null);
    try {
      await updateCall(call.id, {
        call_type: callType || null,
        outcome,
        call_reason: callReason || null,
        note: note || null,
        next_followup_at: outcome === "interested_callback" ? nextFollowupAt : null,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
  const reasonOptions = outcome === "interested_callback" ? INTEREST_REASONS : NOT_INTERESTED_REASONS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sea-800">{t("editHistory.editCall")}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <select value={callType} onChange={(e) => setCallType(e.target.value as CallType)} className={field}>
            <option value="">{t("calls.callTypePlaceholder")}</option>
            {CALL_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {t(`callType.${ct}`)}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => selectOutcome(o)}
                className={`flex-1 rounded-lg py-2.5 text-xs font-semibold ${
                  outcome === o ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {t(`callOutcome.${o}`)}
              </button>
            ))}
          </div>

          {outcome === "interested_callback" && (
            <>
              <FollowUpPicker value={nextFollowupAt} onChange={setNextFollowupAt} allowCustom />
              <select
                value={callReason}
                onChange={(e) => setCallReason(e.target.value as CallReason)}
                className={field}
              >
                <option value="">{t("calls.interestReasonPlaceholder")}</option>
                {reasonOptions.map((r) => (
                  <option key={r} value={r}>
                    {t(`callReason.${r}`)}
                  </option>
                ))}
              </select>
            </>
          )}

          {outcome === "not_interested" && (
            <select
              required
              value={callReason}
              onChange={(e) => setCallReason(e.target.value as CallReason)}
              className={field}
            >
              <option value="">{t("calls.notInterestedReasonPlaceholder")}</option>
              {reasonOptions.map((r) => (
                <option key={r} value={r}>
                  {t(`callReason.${r}`)}
                </option>
              ))}
            </select>
          )}

          <textarea
            placeholder={t("calls.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={`${field} resize-none`}
          />

          {outcome !== call.outcome && <p className="text-xs text-warn-600">{t("editHistory.orderHint")}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || (outcome === "not_interested" && !callReason)}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("common.saveChanges")}
          </button>
        </form>
      </div>
    </div>
  );
}
