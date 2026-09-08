import { errorMessage } from "../../lib/errors";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileSpreadsheet } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { exportAllDataToExcel, fetchExportCounts, type ExportCounts } from "../../lib/exportData";

export default function PullDataPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [counts, setCounts] = useState<ExportCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== "manager") return;
    fetchExportCounts()
      .then(setCounts)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [profile]);

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await exportAllDataToExcel();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  if (profile?.role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        {t("pullData.managerOnly")}
      </div>
    );
  }

  const rows: { key: keyof ExportCounts; labelKey: string }[] = [
    { key: "accounts", labelKey: "nav.accounts" },
    { key: "visits", labelKey: "visits.myVisitsTitle" },
    { key: "calls", labelKey: "calls.myCallsTitle" },
    { key: "orders", labelKey: "accounts.orderHistory" },
    { key: "orderItems", labelKey: "pullData.orderItems" },
    { key: "products", labelKey: "nav.inventory" },
    { key: "staff", labelKey: "reps.title" },
    { key: "auditLog", labelKey: "editHistory.title" },
  ];

  return (
    <div className="mx-auto h-full max-w-xl overflow-y-auto px-6 py-6">
      <h1 className="text-xl font-bold text-sea-800">{t("pullData.title")}</h1>
      <p className="mt-1 text-sm text-gray-500">{t("pullData.subtitle")}</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <p className="p-4 text-sm text-gray-400">{t("common.loading")}</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.key}
              className="flex items-center justify-between border-t border-gray-100 px-4 py-3 first:border-t-0"
            >
              <span className="text-sm text-gray-900">{t(r.labelKey)}</span>
              <span className="text-sm font-semibold text-gray-500" dir="ltr">
                {counts?.[r.key] ?? 0}
              </span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => void onExport()}
        disabled={exporting || loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
      >
        {exporting ? (
          t("pullData.exporting")
        ) : (
          <>
            <Download size={16} /> {t("pullData.exportButton")}
          </>
        )}
      </button>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
        <FileSpreadsheet size={13} /> {t("pullData.exportHint")}
      </p>
    </div>
  );
}
