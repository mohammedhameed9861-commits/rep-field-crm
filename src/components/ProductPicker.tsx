import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, Minus, Trash2, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/database";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface Props {
  items: CartItem[];
  onItemsChange: (items: CartItem[]) => void;
}

export function ProductPicker({ items, onItemsChange }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(10);
      setResults(data ?? []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function addProduct(product: Product) {
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      onItemsChange([...items, { product, quantity: 1 }]);
    }
    setQuery("");
    setResults([]);
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      onItemsChange(items.filter((i) => i.product.id !== productId));
      return;
    }
    onItemsChange(items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)));
  }

  function removeItem(productId: string) {
    onItemsChange(items.filter((i) => i.product.id !== productId));
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("productPicker.searchPlaceholder")}
          className="tap-target w-full rounded-xl border border-gray-300 ps-11 pe-4 text-base"
        />
      </div>

      {searching && <p className="text-sm text-gray-400">{t("productPicker.searching")}</p>}
      {!searching && query.trim().length > 0 && results.length === 0 && (
        <p className="text-sm text-gray-400">{t("productPicker.noResults")}</p>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => addProduct(product)}
                disabled={product.stock_quantity <= 0}
                className="tap-target flex w-full items-center gap-3 px-4 text-start active:bg-gray-50 disabled:opacity-50"
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Package className="h-5 w-5 text-gray-400" />
                  </span>
                )}
                <span className="flex-1">
                  <span className="block font-medium text-gray-900">{product.name}</span>
                  <span className="block text-xs text-gray-500">
                    {product.stock_quantity > 0
                      ? t("productPicker.inStock", { count: product.stock_quantity })
                      : t("productPicker.outOfStock")}
                    {" · "}
                    {t("productPicker.price", { amount: product.price.toLocaleString() })}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t("productPicker.addedItems")}
        </p>
        {items.length === 0 && <p className="text-sm text-gray-400">{t("productPicker.noItemsYet")}</p>}
        <ul className="divide-y divide-gray-100">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-500">{(quantity * product.price).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300"
                  aria-label={t("productPicker.remove")}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300"
                  aria-label={t("productPicker.quantity")}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(product.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500"
                  aria-label={t("productPicker.remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {items.length > 0 && (
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
            <span>{t("productPicker.total")}</span>
            <span>{total.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
