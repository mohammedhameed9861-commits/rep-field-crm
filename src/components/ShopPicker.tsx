import { useEffect, useState } from "react";
import { Search, Plus, Store, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import type { Shop } from "@/types/database";

type ShopSelection = Shop | { shop_name: string; shop_number: string; isNew: true };

interface Props {
  selected: ShopSelection | null;
  onSelect: (shop: ShopSelection | null) => void;
}

export function ShopPicker({ selected, onSelect }: Props) {
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

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-brand-500 bg-brand-50 p-4">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="font-semibold text-gray-900">{selected.shop_name}</p>
            <p className="text-sm text-gray-500">#{selected.shop_number}</p>
          </div>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-sm font-medium text-brand-600">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shop name or number"
          className="tap-target w-full rounded-xl border border-gray-300 pl-11 pr-4 text-base"
        />
      </div>

      {searching && <p className="text-sm text-gray-400">Searching...</p>}

      {results.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
          {results.map((shop) => (
            <li key={shop.id}>
              <button
                type="button"
                onClick={() => onSelect(shop)}
                className="tap-target flex w-full items-center gap-3 px-4 text-left active:bg-gray-50"
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
          <Plus className="h-5 w-5" /> New shop not listed
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-gray-200 p-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Shop name"
            className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
          />
          <input
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            placeholder="Shop number / code"
            className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
          />
          <Button
            type="button"
            disabled={!newName.trim() || !newNumber.trim()}
            onClick={() =>
              onSelect({ shop_name: newName.trim(), shop_number: newNumber.trim(), isNew: true })
            }
          >
            Use this shop
          </Button>
        </div>
      )}
    </div>
  );
}
