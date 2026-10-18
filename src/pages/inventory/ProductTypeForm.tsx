import { friendlyError } from "../../lib/errors";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { createProductType, updateProductType } from "../../lib/productTypes";
import type { ProductType } from "../../lib/types";

export default function ProductTypeForm({
  product,
  onClose,
  onSaved,
}: {
  /** Pass an existing product to edit its name/price; omit to create a new one. */
  product?: ProductType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const editing = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing) await updateProductType(product!.id, name.trim(), Number(price) || 0);
      else await createProductType(name.trim(), Number(price) || 0);
      onSaved();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
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
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">
              {t("productForm.priceLabel")}
            </span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={field}
              dir="ltr"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? t("common.saving") : editing ? t("common.saveChanges") : t("productForm.addTitle")}
          </button>
        </form>
      </div>
    </div>
  );
}
