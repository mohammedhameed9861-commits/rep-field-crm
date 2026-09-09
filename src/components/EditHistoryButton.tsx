import { friendlyError } from "../lib/errors";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { History, X } from "lucide-react";
import { fetchAuditHistory } from "../lib/audit";
import { formatDateTime } from "../lib/format";
import type { AuditEntry } from "../lib/types";

/** A small "History" button + modal showing every edit ever made to one record — who,
 * when, and exactly which fields changed. `fields` controls which columns are worth
 * showing a diff for (skip internal ones like id/photo_path/updated_at). */
export default function EditHistoryButton({
  tableName,
  recordId,
  fields,
}: {
  tableName: string;
  recordId: string;
  fields: { key: string; label: string }[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      setEntries(await fetchAuditHistory(tableName, recordId));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => void load()}
        className="flex items-center gap-1 text-[10.5px] font-semibold text-gray-400 hover:text-teal-700"
      >
        <History size={11} /> {t("editHistory.view")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-sea-800">{t("editHistory.title")}</h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {loading ? (
              <p className="text-sm text-gray-400">{t("common.loading")}</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-gray-400">{t("editHistory.none")}</p>
            ) : (
              <div className="flex flex-col">
                {entries.map((entry) => {
                  const changed = fields.filter(
                    (f) => JSON.stringify(entry.before[f.key]) !== JSON.stringify(entry.after[f.key]),
                  );
                  return (
                    <div key={entry.id} className="border-t border-gray-100 py-3 first:border-t-0">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">
                          {entry.changed_by_profile?.full_name ?? t("editHistory.unknown")}
                        </span>{" "}
                        &middot; <span dir="ltr">{formatDateTime(entry.changed_at)}</span>
                      </p>
                      <div className="mt-1.5 flex flex-col gap-1">
                        {changed.length === 0 ? (
                          <p className="text-xs text-gray-400">{t("editHistory.noFieldChange")}</p>
                        ) : (
                          changed.map((f) => (
                            <p key={f.key} className="text-xs text-gray-700">
                              <span className="font-semibold">{f.label}:</span>{" "}
                              <span className="text-red-500 line-through">
                                {String(entry.before[f.key] ?? "—")}
                              </span>{" "}
                              → <span className="text-teal-700">{String(entry.after[f.key] ?? "—")}</span>
                            </p>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
