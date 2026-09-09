import { friendlyError } from "../../lib/errors";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, X } from "lucide-react";
import { createProductType, deleteProductType, fetchProductTypes } from "../../lib/productTypes";
import type { ProductType } from "../../lib/types";

/** Lets a manager curate the picklist "Add Product" chooses a type from — so a new product's
 * name comes from a consistent list instead of free text that drifts ("Red Rose" vs "red roses"). */
export default function ManageProductTypesModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  /** Called whenever the list changes, so the caller can refetch for its own picker. */
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setTypes(await fetchProductTypes());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createProductType(name.trim());
      setName("");
      await reload();
      onChanged();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(pt: ProductType) {
    if (!confirm(t("productTypes.deleteConfirm", { name: pt.name }))) return;
    setError(null);
    try {
      await deleteProductType(pt.id);
      await reload();
      onChanged();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sea-800">{t("productTypes.title")}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-500">{t("productTypes.subtitle")}</p>

        <form onSubmit={onSubmit} className="mb-4 flex gap-2">
          <input
            placeholder={t("productTypes.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="shrink-0 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {t("productTypes.add")}
          </button>
        </form>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400">{t("common.loading")}</p>
          ) : types.length === 0 ? (
            <p className="text-sm text-gray-400">{t("productTypes.noneYet")}</p>
          ) : (
            types.map((pt) => (
              <div
                key={pt.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
              >
                <span className="text-sm text-gray-800">{pt.name}</span>
                <button
                  onClick={() => onDelete(pt)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
