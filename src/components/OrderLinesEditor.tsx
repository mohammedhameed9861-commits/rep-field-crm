import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, X } from "lucide-react";
import type { ProductType } from "../lib/types";
import type { OrderLineDraft } from "../lib/orderLines";

// Deliberately no w-full here: in a flex row, a w-full sibling that also refuses to shrink
// (as the quantity box did) takes the whole row and crushes the product dropdown down to
// its arrow — the "product name doesn't show" bug.
const field =
  "rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

/** The "Products (from the management-set list, multi-select) → Quantity each" picker an
 * order's line items are built from. One tap opens a checklist of every product type —
 * check as many as the order needs in that same list, each becomes its own line below
 * with its own quantity — instead of adding and picking one product line at a time. */
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedNames = new Set(lines.map((l) => l.product_name).filter(Boolean));

  function toggleProduct(name: string) {
    if (selectedNames.has(name)) {
      onChange(lines.filter((l) => l.product_name !== name));
      return;
    }
    // Fill the form's one still-blank starting row first, if there is one, instead of
    // always appending — so checking a single product from a fresh form leaves exactly
    // one line, not an extra empty row sitting behind it.
    const blankIdx = lines.findIndex((l) => !l.product_name);
    if (blankIdx !== -1) {
      onChange(lines.map((l, i) => (i === blankIdx ? { ...l, product_name: name } : l)));
    } else {
      onChange([...lines, { product_name: name, quantity: "" }]);
    }
  }

  function updateQuantity(i: number, quantity: string) {
    onChange(lines.map((l, idx) => (idx === i ? { ...l, quantity } : l)));
  }
  function remove(i: number) {
    onChange(lines.filter((_, idx) => idx !== i));
  }

  if (productTypes.length === 0) {
    return <p className="text-xs text-warn-600">{t("orderLines.noTypesYet")}</p>;
  }

  return (
    <div className="space-y-2">
      <div>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className={`${field} flex w-full items-center justify-between text-start`}
        >
          <span className={selectedNames.size > 0 ? "text-gray-900" : "text-gray-400"}>
            {selectedNames.size > 0
              ? t(selectedNames.size === 1 ? "orderLines.productsSelectedOne" : "orderLines.productsSelectedOther", {
                  count: selectedNames.size,
                })
              : t("orderLines.productPlaceholder")}
          </span>
          <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
        </button>

        {pickerOpen && (
          <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {productTypes.map((pt) => {
              const checked = selectedNames.has(pt.name);
              return (
                <label
                  key={pt.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProduct(pt.name)}
                    className="h-4 w-4 shrink-0 accent-teal-500"
                  />
                  <span className="text-gray-800">{pt.name}</span>
                </label>
              );
            })}
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="mt-1 w-full rounded-md bg-gray-50 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              {t("orderLines.done")}
            </button>
          </div>
        )}
      </div>

      {lines
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => line.product_name)
        .map(({ line, i }) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`${field} min-w-0 flex-1 truncate bg-gray-50 text-gray-800`}
            >
              {line.product_name}
            </span>
            <input
              required
              type="number"
              min="0"
              step="0.5"
              placeholder={t("visits.bouquetsPlaceholder")}
              value={line.quantity}
              onChange={(e) => updateQuantity(i, e.target.value)}
              className={`${field} w-24 shrink-0`}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <X size={16} />
            </button>
          </div>
        ))}
    </div>
  );
}
