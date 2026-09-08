import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { createProduct, updateProduct } from "../../lib/inventory";
import type { Product } from "../../lib/types";

export default function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  /** Pass an existing product to edit it (including its stock count); omit to create a new one. */
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const editing = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [stockQty, setStockQty] = useState(String(product?.stock_qty ?? 0));
  const [threshold, setThreshold] = useState(String(product?.low_stock_threshold ?? 0));
  const [critical, setCritical] = useState(String(product?.critical_threshold ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const input = {
      name,
      stock_qty: Number(stockQty) || 0,
      low_stock_threshold: Number(threshold) || 0,
      critical_threshold: Number(critical) || 0,
    };
    try {
      if (editing) await updateProduct(product!.id, input);
      else await createProduct(input);
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
          <h2 className="text-lg font-bold text-sea-800">
            {editing ? t("productForm.editTitle") : t("productForm.addTitle")}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            required
            placeholder={t("productForm.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-semibold text-gray-500">
                {t("productForm.stockLabel")}
              </span>
              <input
                required
                type="number"
                min="0"
                step="0.5"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className={field}
                dir="ltr"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-xs font-semibold text-gray-500">
                {t("productForm.thresholdLabel")}
              </span>
              <input
                required
                type="number"
                min="0"
                step="0.5"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={field}
                dir="ltr"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">
              {t("productForm.criticalLabel")}
            </span>
            <input
              required
              type="number"
              min="0"
              step="0.5"
              value={critical}
              onChange={(e) => setCritical(e.target.value)}
              className={field}
              dir="ltr"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? t("common.saving") : editing ? t("common.saveChanges") : t("productForm.addTitle")}
          </button>
        </form>
      </div>
    </div>
  );
}
