import { errorMessage } from "../../lib/errors";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { updateOrder } from "../../lib/accounts";
import { fetchOrderItems, type OrderLineDraft } from "../../lib/orderLines";
import { fetchProductTypes } from "../../lib/productTypes";
import type { OrderRow, OrderStatus, ProductType } from "../../lib/types";
import OrderLinesEditor from "../../components/OrderLinesEditor";

const STATUSES: OrderStatus[] = ["pending", "delivered", "cancelled"];

export default function EditOrderModal({
  order,
  onClose,
  onSaved,
}: {
  order: OrderRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<OrderLineDraft[] | null>(null);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchOrderItems(order.id), fetchProductTypes()])
      .then(([items, types]) => {
        if (!alive) return;
        setProductTypes(types);
        // A pre-line-items order has nothing to load — start with one line pre-filled
        // with the old total, so the manager only has to pick which product it was.
        setLines(
          items.length > 0
            ? items.map((i) => ({ product_name: i.product_name, quantity: String(i.quantity) }))
            : [{ product_name: "", quantity: String(order.quantity) }],
        );
      })
      .catch((err) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [order.id, order.quantity]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!lines) return;
    setBusy(true);
    setError(null);
    try {
      await updateOrder(order.id, { lines, status });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sea-800">{t("editHistory.editOrder")}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        {!lines ? (
          <p className="text-sm text-gray-400">{t("common.loading")}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <OrderLinesEditor lines={lines} onChange={setLines} productTypes={productTypes} />
            <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className={field}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`orderStatus.${s}`)}
                </option>
              ))}
            </select>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
            >
              {busy ? t("common.saving") : t("common.saveChanges")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
