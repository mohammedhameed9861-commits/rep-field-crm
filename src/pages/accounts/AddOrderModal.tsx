import { friendlyError } from "../../lib/errors";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { addManualOrder, fetchSaleCredits } from "../../lib/accounts";
import { emptyLine, type OrderLineDraft } from "../../lib/orderLines";
import { fetchProductTypes } from "../../lib/productTypes";
import type { OrderStatus, ProductType } from "../../lib/types";
import OrderLinesEditor from "../../components/OrderLinesEditor";

const STATUSES: OrderStatus[] = ["pending", "delivered", "cancelled"];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A manager logs a sale a rep or telesales agent forgot to enter. */
export default function AddOrderModal({
  accountId,
  onClose,
  onSaved,
}: {
  accountId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [staff, setStaff] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<OrderLineDraft[]>([emptyLine()]);
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchSaleCredits(), fetchProductTypes()])
      .then(([s, types]) => {
        if (!alive) return;
        setStaff(s);
        setProductTypes(types);
      })
      .catch((err) => alive && setError(friendlyError(err)));
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!staffId) {
      setError(t("editHistory.pickStaff"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addManualOrder(accountId, { staffId, date, lines, status });
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
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sea-800">{t("editHistory.addOrder")}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={field}>
            <option value="">{t("editHistory.creditTo")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className={field}
            dir="ltr"
          />
          <OrderLinesEditor lines={lines} onChange={setLines} productTypes={productTypes} />
          <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className={field}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`orderStatus.${s}`)}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">{t("editHistory.addOrderHint")}</p>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("common.save")}
          </button>
        </form>
      </div>
    </div>
  );
}
