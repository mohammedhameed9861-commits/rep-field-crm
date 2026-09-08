import { errorMessage } from "../../lib/errors";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { updateOrder } from "../../lib/accounts";
import type { OrderRow, OrderStatus } from "../../lib/types";

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
  const [items, setItems] = useState(order.items);
  const [quantity, setQuantity] = useState(String(order.quantity));
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateOrder(order.id, {
        items,
        quantity: Number(quantity) || 0,
        status,
      });
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sea-800">{t("editHistory.editOrder")}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            required
            placeholder={t("visits.itemsPlaceholder")}
            value={items}
            onChange={(e) => setItems(e.target.value)}
            className={field}
          />
          <input
            required
            type="number"
            min="0"
            step="0.5"
            placeholder={t("visits.bouquetsPlaceholder")}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={field}
            dir="ltr"
          />
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
      </div>
    </div>
  );
}
