import { errorMessage } from "../../lib/errors";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks, Pencil, Plus } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { fetchProducts } from "../../lib/inventory";
import type { Product } from "../../lib/types";
import ProductForm from "./ProductForm";
import ManageProductTypesModal from "./ManageProductTypesModal";
import EditHistoryButton from "../../components/EditHistoryButton";

export default function InventoryPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showManageTypes, setShowManageTypes] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  if (profile?.role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        {t("inventory.managerOnly")}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">{t("inventory.title")}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t(products.length === 1 ? "inventory.countOne" : "inventory.countOther", {
              count: products.length,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManageTypes(true)}
            className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <ListChecks size={16} /> {t("inventory.manageTypes")}
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            <Plus size={16} /> {t("inventory.addProduct")}
          </button>
        </div>
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[1fr_110px_140px_100px_140px] gap-2 border-b border-gray-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <span>{t("inventory.colProduct")}</span>
            <span>{t("inventory.colStock")}</span>
            <span>{t("inventory.colThreshold")}</span>
            <span>{t("inventory.colStatus")}</span>
            <span className="text-end">{t("inventory.colActions")}</span>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-gray-400">{t("common.loading")}</p>
          ) : products.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t("inventory.noProductsYet")}</p>
          ) : (
            products.map((p) => {
              const status =
                p.stock_qty <= p.critical_threshold ? "critical" : p.stock_qty <= p.low_stock_threshold ? "low" : "ok";
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[1fr_110px_140px_100px_140px] items-center gap-2 border-t border-gray-100 px-4 py-3"
                >
                  <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                  <span className="text-sm text-gray-700" dir="ltr">
                    {p.stock_qty}
                  </span>
                  <span className="text-sm text-gray-500" dir="ltr">
                    {p.low_stock_threshold} / {p.critical_threshold}
                  </span>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                      status === "critical"
                        ? "bg-red-100 text-red-600"
                        : status === "low"
                          ? "bg-warn-100 text-warn-600"
                          : "bg-teal-50 text-teal-700"
                    }`}
                  >
                    {t(`inventory.status.${status}`)}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => setEditing(p)}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil size={13} /> {t("common.edit")}
                    </button>
                    <EditHistoryButton
                      tableName="products"
                      recordId={p.id}
                      fields={[
                        { key: "name", label: t("editHistory.fieldName") },
                        { key: "stock_qty", label: t("inventory.colStock") },
                        { key: "low_stock_threshold", label: t("productForm.thresholdLabel") },
                        { key: "critical_threshold", label: t("productForm.criticalLabel") },
                      ]}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showNew && (
        <ProductForm
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            void reload();
          }}
        />
      )}

      {editing && (
        <ProductForm
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}

      {showManageTypes && (
        <ManageProductTypesModal onClose={() => setShowManageTypes(false)} onChanged={() => {}} />
      )}
    </div>
  );
}
