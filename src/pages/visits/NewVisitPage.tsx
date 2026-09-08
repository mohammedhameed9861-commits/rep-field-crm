import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Search, X } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { createVisit, searchAccounts } from "../../lib/visits";
import type { Account, NoSaleReason, VisitOutcome } from "../../lib/types";
import { NO_SALE_REASON_LABEL } from "../../lib/types";

const field =
  "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

export default function NewVisitPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [outcome, setOutcome] = useState<VisitOutcome>("sold");
  const [noSaleReason, setNoSaleReason] = useState<NoSaleReason | "">("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState("");
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) return;
    let alive = true;
    searchAccounts(search)
      .then((data) => alive && setResults(data))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    return () => {
      alive = false;
    };
  }, [search, account]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile || !account || !photo) return;
    setBusy(true);
    setError(null);
    try {
      await createVisit({
        account_id: account.id,
        rep_id: profile.id,
        photo,
        outcome,
        no_sale_reason: outcome === "no_sale" ? (noSaleReason || "other") : null,
        note: note || null,
        order:
          outcome === "sold"
            ? {
                items,
                quantity: Number(quantity) || 0,
                amount: Number(amount) || 0,
                status: "pending",
              }
            : undefined,
      });
      navigate("/visits");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto px-6 py-6">
      <h1 className="text-xl font-bold text-sea-800">Log a Visit</h1>

      {!account ? (
        <div className="mt-5">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
            <Search size={15} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any shop by name…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              autoFocus
            />
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {results.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccount(a)}
                className="rounded-lg p-3 text-start text-sm hover:bg-gray-50"
              >
                <span className="font-semibold text-gray-900">{a.name}</span>
                <span className="ml-2 text-xs text-gray-400">{a.area ?? ""}</span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="p-3 text-sm text-gray-400">No shops match.</p>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-teal-50 px-3.5 py-2.5">
            <div>
              <div className="text-sm font-semibold text-teal-800">{account.name}</div>
              <div className="text-xs text-teal-600">{account.area ?? ""}</div>
            </div>
            <button
              type="button"
              onClick={() => setAccount(null)}
              className="rounded-full p-1.5 text-teal-600 hover:bg-teal-100"
            >
              <X size={16} />
            </button>
          </div>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-6 text-sm text-gray-500 hover:border-teal-300 hover:text-teal-600">
            <Camera size={22} />
            {photo ? photo.name : "Take a photo of the shop"}
            <input
              required
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOutcome("sold")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                outcome === "sold" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              Sold
            </button>
            <button
              type="button"
              onClick={() => setOutcome("no_sale")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                outcome === "no_sale" ? "bg-warn-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              No Sale
            </button>
          </div>

          {outcome === "sold" ? (
            <div className="space-y-3">
              <input
                required
                placeholder="Items (e.g. Red Roses x6, Colored Roses x3)"
                value={items}
                onChange={(e) => setItems(e.target.value)}
                className={field}
              />
              <div className="flex gap-3">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Bouquets"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={field}
                />
                <input
                  required
                  type="number"
                  min="0"
                  placeholder="Amount (IQD)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={field}
                  dir="ltr"
                />
              </div>
            </div>
          ) : (
            <select
              value={noSaleReason}
              onChange={(e) => setNoSaleReason(e.target.value as NoSaleReason)}
              className={field}
            >
              <option value="">Reason (optional)</option>
              {(Object.keys(NO_SALE_REASON_LABEL) as NoSaleReason[]).map((r) => (
                <option key={r} value={r}>
                  {NO_SALE_REASON_LABEL[r]}
                </option>
              ))}
            </select>
          )}

          <textarea
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={`${field} resize-none`}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !photo}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Visit"}
          </button>
        </form>
      )}
    </div>
  );
}
