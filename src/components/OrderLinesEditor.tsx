import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import type { ProductType } from "../lib/types";
import { emptyLine, type OrderLineDraft } from "../lib/orderLines";

const field =
  "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

/** The repeatable "Product (from the management-set list) → Quantity" picker an
 * order's line items are built from — replaces free-typing "Red Roses x6,
 * Colored Roses x3" into a single text box. */
export default function OrderLinesEditor({
  lines,
  onChange,
  productTypes,
}: {
  lines: OrderLineDraft[];
  onChange: (lines: OrderLineDraft[]) => void;
  productTypes: ProductType[];
}) {
  const { t } = useTranslation();

  function update(i: number, patch: Partial<OrderLineDraft>) {
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function remove(i: number) {
    onChange(lines.filter((_, idx) => idx !== i));
  }

  if (productTypes.length === 0) {
    return <p className="text-xs text-warn-600">{t("orderLines.noTypesYet")}</p>;
  }

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-2">
          <select
            required
            value={line.product_name}
            onChange={(e) => update(i, { product_name: e.target.value })}
            className={field}
          >
            <option value="">{t("orderLines.productPlaceholder")}</option>
            {productTypes.map((pt) => (
              <option key={pt.id} value={pt.name}>
                {pt.name}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            min="0"
            step="0.5"
            placeholder={t("visits.bouquetsPlaceholder")}
            value={line.quantity}
            onChange={(e) => update(i, { quantity: e.target.value })}
            className={`${field} w-28 shrink-0`}
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={lines.length === 1}
            className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...lines, emptyLine()])}
        className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline"
      >
        <Plus size={14} /> {t("orderLines.addProduct")}
      </button>
    </div>
  );
}
