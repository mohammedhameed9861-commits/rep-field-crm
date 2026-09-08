import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { updateCall } from "../../lib/calls";
import type { Call, CallOutcome } from "../../lib/types";
import FollowUpPicker from "../../components/FollowUpPicker";

const OUTCOMES: CallOutcome[] = ["order_placed", "follow_up", "no_answer"];

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
  const [outcome, setOutcome] = useState<CallOutcome>(call.outcome);
  const [note, setNote] = useState(call.note ?? "");
  const [nextFollowupAt, setNextFollowupAt] = useState<string | null>(call.next_followup_at);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateCall(call.id, { outcome, note: note || null, next_followup_at: nextFollowupAt });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

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
          <div className="flex gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={`flex-1 rounded-lg py-2.5 text-xs font-semibold ${
                  outcome === o ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {t(`callOutcome.${o}`)}
              </button>
            ))}
          </div>

          <textarea
            placeholder={t("calls.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={`${field} resize-none`}
          />

          <FollowUpPicker value={nextFollowupAt} onChange={setNextFollowupAt} />

          {outcome !== call.outcome && <p className="text-xs text-warn-600">{t("editHistory.orderHint")}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("common.saveChanges")}
          </button>
        </form>
      </div>
    </div>
  );
}
