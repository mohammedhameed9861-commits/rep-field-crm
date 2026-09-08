import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { createVisit, searchAccounts } from "../../lib/visits";
import type { Account, NoSaleReason, VisitOutcome } from "../../lib/types";
import CameraCapture from "../../components/CameraCapture";
import FollowUpPicker from "../../components/FollowUpPicker";

const NO_SALE_REASONS: NoSaleReason[] = [
  "no_need_today",
  "price_too_high",
  "bought_competitor",
  "no_stock_needed",
  "quality_concern",
  "shop_closed",
  "owner_unavailable",
  "payment_issue",
  "other",
];

const field =
  "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

export default function NewVisitPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [outcome, setOutcome] = useState<VisitOutcome>("sold");
  const [noSaleReason, setNoSaleReason] = useState<NoSaleReason | "">("");
  const [note, setNote] = useState("");
  const [nextFollowupAt, setNextFollowupAt] = useState<string | null>(null);
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
        next_followup_at: nextFollowupAt,
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
      <h1 className="text-xl font-bold text-sea-800">{t("visits.logVisit")}</h1>

      {!account ? (
        <div className="mt-5">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
            <Search size={15} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("visits.searchPlaceholder")}
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
              </button>
            ))}
            {results.length === 0 && <p className="p-3 text-sm text-gray-400">{t("visits.noShopsMatch")}</p>}
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

          <CameraCapture captured={photo} onCapture={setPhoto} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOutcome("sold")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                outcome === "sold" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {t("visits.sold")}
            </button>
            <button
              type="button"
              onClick={() => setOutcome("no_sale")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                outcome === "no_sale" ? "bg-warn-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {t("visits.noSale")}
            </button>
          </div>

          {outcome === "sold" ? (
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
          ) : (
            <select
              value={noSaleReason}
              onChange={(e) => setNoSaleReason(e.target.value as NoSaleReason)}
              className={field}
            >
              <option value="">{t("visits.reasonPlaceholder")}</option>
              {NO_SALE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`noSaleReason.${r}`)}
                </option>
              ))}
            </select>
          )}

          <textarea
            placeholder={t("visits.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={`${field} resize-none`}
          />

          <FollowUpPicker value={nextFollowupAt} onChange={setNextFollowupAt} />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !photo}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("visits.saveVisit")}
          </button>
        </form>
      )}
    </div>
  );
}
