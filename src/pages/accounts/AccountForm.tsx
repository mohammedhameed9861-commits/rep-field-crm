import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { createAccount, updateAccount } from "../../lib/accounts";
import type { Account, Profile, ShopClass } from "../../lib/types";
import { SHOP_CLASS_LABEL } from "../../lib/types";

export default function AccountForm({
  account,
  onClose,
  onSaved,
}: {
  /** Pass an existing account to edit it; omit to create a new one. */
  account?: Account;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(account);

  const [name, setName] = useState(account?.name ?? "");
  const [area, setArea] = useState(account?.area ?? "");
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [shopClass, setShopClass] = useState<ShopClass | "">(account?.shop_class ?? "");
  const [repId, setRepId] = useState(account?.assigned_rep_id ?? "");
  const [reps, setReps] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "rep")
      .eq("active", true)
      .then(({ data }) => setReps((data ?? []) as Profile[]));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const input = {
      name,
      area: area || null,
      phone: phone || null,
      shop_class: shopClass || null,
      assigned_rep_id: repId || null,
    };
    try {
      if (editing) await updateAccount(account!.id, input);
      else await createAccount(input);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
          <h2 className="text-lg font-bold text-sea-800">
            {editing ? "Edit Account" : "Add Account"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            required
            placeholder="Shop name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
          <input
            placeholder="Area (e.g. Karkh)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={field}
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={field}
            dir="ltr"
          />
          <select
            value={shopClass}
            onChange={(e) => setShopClass(e.target.value as ShopClass | "")}
            className={field}
          >
            <option value="">Shop class (optional)</option>
            {(Object.keys(SHOP_CLASS_LABEL) as ShopClass[]).map((c) => (
              <option key={c} value={c}>
                {SHOP_CLASS_LABEL[c]}
              </option>
            ))}
          </select>
          <select value={repId} onChange={(e) => setRepId(e.target.value)} className={field}>
            <option value="">Assigned rep (optional)</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? "Saving…" : editing ? "Save Changes" : "Add Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
