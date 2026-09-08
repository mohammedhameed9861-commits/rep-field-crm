import { errorMessage } from "../../lib/errors";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { createCall, searchAccounts } from "../../lib/calls";
import type { Account, CallOutcome, CallReason, CallType } from "../../lib/types";
import FollowUpPicker from "../../components/FollowUpPicker";

const field =
  "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

const CALL_TYPES: CallType[] = ["new_customer", "reactivation", "follow_up"];
const OUTCOMES: CallOutcome[] = ["interested_callback", "not_interested", "order_placed", "no_answer"];
const INTEREST_REASONS: CallReason[] = [
  "wants_price",
  "wants_availability",
  "wants_specific_flower",
  "waiting_next_purchase",
  "needs_owner_approval",
  "other",
];
const NOT_INTERESTED_REASONS: CallReason[] = [
  "price_too_high",
  "bought_competitor",
  "no_current_demand",
  "quality_concern",
  "doesnt_want_change_supplier",
  "other",
];

export default function NewCallPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);

  const [callType, setCallType] = useState<CallType | "">("");
  const [outcome, setOutcome] = useState<CallOutcome>("order_placed");
  const [callReason, setCallReason] = useState<CallReason | "">("");
  const [note, setNote] = useState("");
  const [nextFollowupAt, setNextFollowupAt] = useState<string | null>(null);
  const [items, setItems] = useState("");
  const [quantity, setQuantity] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) return;
    let alive = true;
    searchAccounts(search)
      .then((data) => alive && setResults(data))
      .catch((err) => setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [search, account]);

  function selectOutcome(o: CallOutcome) {
    setOutcome(o);
    // Reason only ever applies to these two outcomes; the DB forbids it on the others.
    if (o !== "interested_callback" && o !== "not_interested") setCallReason("");
    // Same for the follow-up date — it's scoped to "Interested / Call Back" only.
    if (o !== "interested_callback") setNextFollowupAt(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile || !account || !callType) return;
    if (outcome === "not_interested" && !callReason) return;
    setBusy(true);
    setError(null);
    try {
      await createCall({
        account_id: account.id,
        telesales_id: profile.id,
        call_type: callType,
        outcome,
        call_reason: callReason || null,
        note: note || null,
        next_followup_at: outcome === "interested_callback" ? nextFollowupAt : null,
        order:
          outcome === "order_placed"
            ? {
                items,
                quantity: Number(quantity) || 0,
                status: "pending",
              }
            : undefined,
      });
      navigate("/calls");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const reasonOptions = outcome === "interested_callback" ? INTEREST_REASONS : NOT_INTERESTED_REASONS;

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

          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-500">{t("callType.label")}</p>
            <select
              required
              value={callType}
              onChange={(e) => setCallType(e.target.value as CallType)}
              className={field}
            >
              <option value="">{t("calls.callTypePlaceholder")}</option>
              {CALL_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {t(`callType.${ct}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => selectOutcome(o)}
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
            </div>
          )}

          {outcome === "interested_callback" && (
            <>
              <FollowUpPicker value={nextFollowupAt} onChange={setNextFollowupAt} allowCustom />
              <select
                value={callReason}
                onChange={(e) => setCallReason(e.target.value as CallReason)}
                className={field}
              >
                <option value="">{t("calls.interestReasonPlaceholder")}</option>
                {reasonOptions.map((r) => (
                  <option key={r} value={r}>
                    {t(`callReason.${r}`)}
                  </option>
                ))}
              </select>
            </>
          )}

          {outcome === "not_interested" && (
            <select
              required
              value={callReason}
              onChange={(e) => setCallReason(e.target.value as CallReason)}
              className={field}
            >
              <option value="">{t("calls.notInterestedReasonPlaceholder")}</option>
              {reasonOptions.map((r) => (
                <option key={r} value={r}>
                  {t(`callReason.${r}`)}
                </option>
              ))}
            </select>
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
            disabled={busy || !callType || (outcome === "not_interested" && !callReason)}
            className="w-full rounded-full bg-teal-500 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("calls.saveCall")}
          </button>
        </form>
      )}
    </div>
  );
}
