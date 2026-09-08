import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { createCall, searchAccounts } from "../../lib/calls";
import type { Account, CallOutcome } from "../../lib/types";

const field =
  "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

const OUTCOMES: CallOutcome[] = ["order_placed", "follow_up", "no_answer"];

export default function NewCallPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);

  const [outcome, setOutcome] = useState<CallOutcome>("order_placed");
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
    if (!profile || !account) return;
    setBusy(true);
    setError(null);
    try {
      await createCall({
        account_id: account.id,
        telesales_id: profile.id,
        outcome,
        note: note || null,
        order:
          outcome === "order_placed"
            ? {
                items,
                quantity: Number(quantity) || 0,
                amount: Number(amount) || 0,
                status: "pending",
              }
            : undefined,
      });
      navigate("/calls");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto px-6 py-6">
      <h1 className="text-xl font-bold text-sea-800">{t("calls.logCall")}</h1>

      {!account ? (
        <div className="mt-5">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
            <Search size={15} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("calls.searchPlaceholder")}
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
                <span className="ms-2 text-xs text-gray-400">{a.area ?? ""}</span>
                {a.phone && (
                  <span className="ms-2 text-xs text-gray-400" dir="ltr">
                    {a.phone}
                  </span>
                )}
              </button>
            ))}
            {results.length === 0 && <p className="p-3 text-sm text-gray-400">{t("calls.noShopsMatch")}</p>}
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-plum-100 px-3.5 py-2.5">
            <div>
              <div className="text-sm font-semibold text-plum-500">{account.name}</div>
              <div className="text-xs text-plum-400">
                {account.area ?? ""} {account.phone ? `· ${account.phone}` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAccount(null)}
              className="rounded-full p-1.5 text-plum-500 hover:bg-plum-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={`flex-1 rounded-lg py-2.5 text-xs font-semibold ${
                  outcome === o ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {t(`callOutcome.${o}`)}
              </button>
            ))}
          </div>

          {outcome === "order_placed" && (
            <div className="space-y-3">
              <input
                required
                placeholder={t("visits.itemsPlaceholder")}
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
                  placeholder={t("visits.bouquetsPlaceholder")}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={field}
                />
                <input
                  required
                  type="number"
                  min="0"
                  placeholder={t("visits.amountPlaceholder")}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={field}
                  dir="ltr"
                />
              </div>
            </div>
          )}

          <textarea
            placeholder={t("calls.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={`${field} resize-none`}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("calls.saveCall")}
          </button>
        </form>
      )}
    </div>
  );
}
