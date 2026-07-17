import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, Store, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import type { Shop, ShopClassification } from "@/types/database";

type ShopSelection =
  | Shop
  | { shop_name: string; shop_number: string; isNew: true; classification?: ShopClassification | null };

interface Props {
  selected: ShopSelection | null;
  onSelect: (shop: ShopSelection | null) => void;
}

const CLASSIFICATIONS: ShopClassification[] = ["A", "B", "C"];

export function ShopPicker({ selected, onSelect }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Shop[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("shops")
        .select("*")
        .or(`shop_name.ilike.%${query}%,shop_number.ilike.%${query}%`)
        .limit(10);
      setResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  async function setClassification(classification: ShopClassification) {
    if (!selected) return;
    if ("isNew" in selected) {
      onSelect({ ...selected, classification });
      return;
    }
    const { data } = await supabase
      .from("shops")
      .update({ classification })
      .eq("id", selected.id)
      .select()
      .single();
    onSelect(data ?? { ...selected, classification });
  }

  if (selected) {
    const currentClassification = selected.classification ?? null;
    return (
      <div className="space-y-3 rounded-xl border border-brand-500 bg-brand-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-semibold text-gray-900">{selected.shop_name}</p>
              <p className="text-sm text-gray-500">#{selected.shop_number}</p>
            </div>
          </div>
          <button type="button" onClick={() => onSelect(null)} className="text-sm font-medium text-brand-600">
            {t("common.change")}
          </button>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">{t("newVisit.classification")}</p>
          <div className="flex gap-2">
            {CLASSIFICATIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setClassification(c)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 font-semibold ${
                  currentClassification === c
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("shopPicker.searchPlaceholder")}
          className="tap-target w-full rounded-xl border border-gray-300 ps-11 pe-4 text-base"
        />
      </div>

      {searching && <p className="text-sm text-gray-400">{t("shopPicker.searching")}</p>}

      {results.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
          {results.map((shop) => (
            <li key={shop.id}>
              <button
                type="button"
                onClick={() => onSelect(shop)}
                className="tap-target flex w-full items-center gap-3 px-4 text-start active:bg-gray-50"
              >
                <Store className="h-5 w-5 shrink-0 text-gray-400" />
                <span>
                  <span className="block font-medium text-gray-900">{shop.shop_name}</span>
                  <span className="block text-sm text-gray-500">#{shop.shop_number}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-600"
        >
          <Plus className="h-5 w-5" /> {t("shopPicker.newShop")}
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-gray-200 p-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("shopPicker.shopName")}
            className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
          />
          <input
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            placeholder={t("shopPicker.shopNumber")}
            className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
          />
          <Button
            type="button"
            disabled={!newName.trim() || !newNumber.trim()}
            onClick={() =>
              onSelect({ shop_name: newName.trim(), shop_number: newNumber.trim(), isNew: true })
            }
          >
            {t("shopPicker.useThisShop")}
          </Button>
        </div>
      )}
    </div>
  );
}
