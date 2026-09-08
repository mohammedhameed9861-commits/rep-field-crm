import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { updateVisit } from "../../lib/visits";
import type { NoSaleReason, Visit, VisitOutcome } from "../../lib/types";

const NO_SALE_REASONS: NoSaleReason[] = ["closed", "not_interested", "already_stocked", "other"];

export default function EditVisitModal({
  visit,
  onClose,
  onSaved,
}: {
  visit: Visit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [outcome, setOutcome] = useState<VisitOutcome>(visit.outcome);
  const [noSaleReason, setNoSaleReason] = useState<NoSaleReason | "">(visit.no_sale_reason ?? "");
  const [note, setNote] = useState(visit.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateVisit(visit.id, {
        outcome,
        no_sale_reason: outcome === "no_sale" ? noSaleReason || "other" : null,
        note: note || null,
      });
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
          <h2 className="text-lg font-bold text-sea-800">{t("editHistory.editVisit")}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOutcome("sold")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                outcome === "sold" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {t("visits.sold")}
            </button>
            <button
              type="button"
              onClick={() => setOutcome("no_sale")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                outcome === "no_sale" ? "bg-warn-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {t("visits.noSale")}
            </button>
          </div>

          {outcome === "no_sale" && (
            <select
              value={noSaleReason}
              onChange={(e) => setNoSaleReason(e.target.value as NoSaleReason)}
              className={field}
            >
              <option value="">{t("visits.reasonPlaceholder")}</option>
              {NO_SALE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`noSaleReason.${r}`)}
                </option>
              ))}
            </select>
          )}

          <textarea
            placeholder={t("visits.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={`${field} resize-none`}
          />

          {outcome !== visit.outcome && <p className="text-xs text-warn-600">{t("editHistory.orderHint")}</p>}
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
