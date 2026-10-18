import { friendlyError } from "../../lib/errors";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { deleteProductType, fetchProductTypes } from "../../lib/productTypes";
import { formatPrice } from "../../lib/format";
import type { ProductType } from "../../lib/types";
import ProductTypeForm from "./ProductTypeForm";
import EditHistoryButton from "../../components/EditHistoryButton";

export default function InventoryPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<ProductType | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setProducts(await fetchProductTypes());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onDelete(p: ProductType) {
    if (!confirm(t("inventory.deleteConfirm", { name: p.name }))) return;
    setError(null);
    try {
      await deleteProductType(p.id);
      await reload();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  if (profile?.role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        {t("inventory.managerOnly")}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 md:px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">{t("inventory.title")}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t(products.length === 1 ? "inventory.countOne" : "inventory.countOther", {
              count: products.length,
            })}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <Plus size={16} /> {t("inventory.addProduct")}
        </button>
      </div>

      {error && <p className="px-4 md:px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-7 pb-6">
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <div className="min-w-[480px] grid grid-cols-[1fr_160px_160px] gap-2 border-b border-gray-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <span>{t("inventory.colProduct")}</span>
            <span>{t("inventory.colPrice")}</span>
            <span className="text-end">{t("inventory.colActions")}</span>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-gray-400">{t("common.loading")}</p>
          ) : products.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t("inventory.noProductsYet")}</p>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="min-w-[480px] grid grid-cols-[1fr_160px_160px] items-center gap-2 border-t border-gray-100 px-4 py-3"
              >
                <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                <span className="text-sm text-gray-700" dir="ltr">
                  {formatPrice(p.price)} {t("common.currency")}
                </span>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditing(p)}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil size={13} /> {t("common.edit")}
                    </button>
                    <button
                      onClick={() => void onDelete(p)}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={13} /> {t("common.delete")}
                    </button>
                  </div>
                  <EditHistoryButton
                    tableName="product_types"
                    recordId={p.id}
                    fields={[
                      { key: "name", label: t("editHistory.fieldName") },
                      { key: "price", label: t("inventory.colPrice") },
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showNew && (
        <ProductTypeForm
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            void reload();
          }}
        />
      )}

      {editing && (
        <ProductTypeForm
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}
