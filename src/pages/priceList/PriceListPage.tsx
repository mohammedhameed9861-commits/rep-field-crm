import { friendlyError } from "../../lib/errors";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchProductTypes } from "../../lib/productTypes";
import { formatPrice } from "../../lib/format";
import type { ProductType } from "../../lib/types";

/** Read-only for reps/telesales — every product and its price, exactly as a manager
 * set it in Inventory. Nothing here is editable; this is a lookup, not a management page. */
export default function PriceListPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchProductTypes()
      .then((data) => alive && setProducts(data))
      .catch((err) => alive && setError(friendlyError(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 md:px-7 pb-4 pt-6">
        <h1 className="text-xl font-bold text-sea-800">{t("priceList.title")}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{t("priceList.subtitle")}</p>
      </div>

      {error && <p className="px-4 md:px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-7 pb-6">
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <div className="min-w-[320px] grid grid-cols-[1fr_160px] gap-2 border-b border-gray-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <span>{t("inventory.colProduct")}</span>
            <span>{t("inventory.colPrice")}</span>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-gray-400">{t("common.loading")}</p>
          ) : products.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t("priceList.noneYet")}</p>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="min-w-[320px] grid grid-cols-[1fr_160px] items-center gap-2 border-t border-gray-100 px-4 py-3"
              >
                <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                <span className="text-sm text-gray-700" dir="ltr">
                  {formatPrice(p.price)} {t("common.currency")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
