import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { fetchProducts } from "../../lib/inventory";
import type { Product } from "../../lib/types";
import ProductForm from "./ProductForm";

export default function InventoryPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
        Only managers can manage inventory.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">Inventory</h1>
          <p className="mt-0.5 text-sm text-gray-500">{products.length} products</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[1fr_140px_140px_90px] gap-2 border-b border-gray-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <span>Product</span>
            <span>Stock on hand</span>
            <span>Low-stock at</span>
            <span className="text-end">Actions</span>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-gray-400">Loading…</p>
          ) : products.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No products yet.</p>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_140px_140px_90px] items-center gap-2 border-t border-gray-100 px-4 py-3"
              >
                <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                <span className="text-sm text-gray-700">{p.stock_qty}</span>
                <span className="text-sm text-gray-500">{p.low_stock_threshold}</span>
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditing(p)}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                </div>
              </div>
            ))
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
    </div>
  );
}
