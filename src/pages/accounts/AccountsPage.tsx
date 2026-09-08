import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, MapPin, Pencil, Phone, Plus, Search, TrendingUp, User } from "lucide-react";
import { fetchAccounts, fetchAccountActivity, setAccountActive } from "../../lib/accounts";
import { formatDate, formatDateTime, formatIQD, timeAgo } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import type { Account, ActivityItem, OrderRow, ShopClass } from "../../lib/types";
import AccountForm from "./AccountForm";
import EditOrderModal from "./EditOrderModal";
import EditHistoryButton from "../../components/EditHistoryButton";

const CLASS_BADGE: Record<ShopClass, string> = {
  A: "bg-teal-100 text-teal-700",
  B: "bg-sea-100 text-sea-700",
  C: "bg-gray-100 text-gray-600",
};

export default function AccountsPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null);

  async function reloadActivity(accountId: string) {
    setDetailLoading(true);
    try {
      const { orders, activity } = await fetchAccountActivity(accountId);
      setOrders(orders);
      setActivity(activity);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }

  async function reload() {
    setLoading(true);
    try {
      setAccounts(await fetchAccounts());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(account: Account) {
    const key = account.active ? "accounts.archiveConfirm" : "accounts.reactivateConfirm";
    if (!confirm(t(key, { name: account.name }))) return;
    try {
      await setAccountActive(account.id, !account.active);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.area ?? "").toLowerCase().includes(q),
    );
  }, [accounts, search]);

  const selected = accounts.find((a) => a.id === id) ?? null;

  useEffect(() => {
    if (!id) {
      setOrders([]);
      setActivity([]);
      return;
    }
    void reloadActivity(id);
  }, [id]);

  const totalOrders = orders.length;
  const lifetimeBouquets = orders.reduce((sum, o) => sum + Number(o.quantity), 0);
  const lastActivity = activity[0]?.at;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">{t("accounts.title")}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t(accounts.length === 1 ? "accounts.countOne" : "accounts.countOther", {
              count: accounts.length,
            })}
          </p>
        </div>
        {profile?.role === "manager" && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            <Plus size={16} /> {t("accounts.addAccount")}
          </button>
        )}
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="flex min-h-0 flex-1 gap-4 px-7 pb-6">
        {/* List */}
        <div className="flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <Search size={15} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("accounts.searchPlaceholder")}
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <p className="p-3 text-sm text-gray-400">{t("common.loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="p-3 text-sm text-gray-400">{t("accounts.noAccountsYet")}</p>
            ) : (
              filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/accounts/${a.id}`)}
                  className={`block w-full rounded-lg p-3 text-start ${
                    !a.active ? "opacity-50" : ""
                  } ${a.id === id ? "border border-teal-200 bg-teal-50" : "hover:bg-gray-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900">{a.name}</span>
                    {!a.active ? (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10.5px] font-bold text-gray-500">
                        {t("accounts.inactive")}
                      </span>
                    ) : (
                      a.shop_class && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${CLASS_BADGE[a.shop_class]}`}
                        >
                          {a.shop_class}
                        </span>
                      )
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">{a.area ?? "—"}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="min-w-0 flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              {t("accounts.selectPrompt")}
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-sea-800">{selected.name}</h2>
                    {!selected.active && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-500">
                        {t("accounts.inactive")}
                      </span>
                    )}
                    {selected.shop_class && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CLASS_BADGE[selected.shop_class]}`}
                      >
                        {t(`shopClass.${selected.shop_class}`)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                    {selected.area && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400" /> {selected.area}
                      </span>
                    )}
                    {selected.phone && (
                      <span className="flex items-center gap-1.5" dir="ltr">
                        <Phone size={13} className="text-gray-400" /> {selected.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <User size={13} className="text-gray-400" />
                      {selected.assigned_rep?.full_name ?? t("accounts.unassigned")}
                    </span>
                  </div>
                </div>
                {profile?.role === "manager" && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil size={13} /> {t("common.edit")}
                    </button>
                    <button
                      onClick={() => void toggleActive(selected)}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      {selected.active ? (
                        <>
                          <Archive size={13} /> {t("accounts.archive")}
                        </>
                      ) : (
                        <>
                          <ArchiveRestore size={13} /> {t("accounts.reactivate")}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {selected.notes && (
                <div className="mt-4 rounded-lg bg-cream-50 px-4 py-3 text-sm text-gray-700">
                  {selected.notes}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-4">
                <div>
                  <div className="text-[11px] font-semibold text-gray-500">
                    {t("accounts.statTotalOrders")}
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-sea-800" dir="ltr">
                    {totalOrders}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500">
                    {t("accounts.statTotalBouquets")}
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-sea-800">
                    {t(lifetimeBouquets === 1 ? "accounts.bouquetOne" : "accounts.bouquetOther", {
                      count: lifetimeBouquets,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500">
                    {t("accounts.statLastActivity")}
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-sea-800">
                    {lastActivity ? timeAgo(lastActivity) : t("accounts.never")}
                  </div>
                </div>
              </div>

              {detailLoading ? (
                <p className="pt-6 text-sm text-gray-400">{t("common.loading")}</p>
              ) : (
                <>
                  <div className="pt-5">
                    <h3 className="mb-2 text-sm font-bold text-sea-800">{t("accounts.orderHistory")}</h3>
                    {orders.length === 0 ? (
                      <p className="text-sm text-gray-400">{t("accounts.noOrdersYet")}</p>
                    ) : (
                      <div className="flex flex-col">
                        <div className="grid grid-cols-[90px_1fr_80px_110px_90px_120px] gap-2 px-1 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          <span>{t("accounts.colDate")}</span>
                          <span>{t("accounts.colItems")}</span>
                          <span>{t("accounts.colBouquets")}</span>
                          <span>{t("accounts.colAmount")}</span>
                          <span>{t("accounts.colStatus")}</span>
                          {profile?.role === "manager" && (
                            <span className="text-end">{t("reps.colActions")}</span>
                          )}
                        </div>
                        {orders.map((o) => (
                          <div
                            key={o.id}
                            className="grid grid-cols-[90px_1fr_80px_110px_90px_120px] items-center gap-2 border-t border-gray-100 px-1 py-2.5"
                          >
                            <span className="text-xs text-gray-600" dir="ltr">
                              {formatDate(o.created_at)}
                            </span>
                            <span className="truncate text-xs text-gray-900">{o.items}</span>
                            <span className="text-xs font-semibold text-gray-900" dir="ltr">
                              {o.quantity}
                            </span>
                            <span className="text-xs font-semibold text-gray-900" dir="ltr">
                              {formatIQD(o.amount)}
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                                  o.status === "delivered"
                                    ? "bg-teal-50 text-teal-700"
                                    : o.status === "cancelled"
                                      ? "bg-gray-100 text-gray-500"
                                      : "bg-warn-100 text-warn-600"
                                }`}
                              >
                                {t(`orderStatus.${o.status}`)}
                              </span>
                              {o.updated_at && (
                                <span className="text-[10.5px] font-semibold text-gray-400">
                                  ({t("editHistory.edited")})
                                </span>
                              )}
                            </div>
                            {profile?.role === "manager" && (
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => setEditingOrder(o)}
                                  className="flex items-center gap-1 text-[10.5px] font-semibold text-gray-400 hover:text-teal-700"
                                >
                                  <Pencil size={10} /> {t("editHistory.edit")}
                                </button>
                                <EditHistoryButton
                                  tableName="orders"
                                  recordId={o.id}
                                  fields={[
                                    { key: "items", label: t("editHistory.fieldItems") },
                                    { key: "quantity", label: t("editHistory.fieldQuantity") },
                                    { key: "amount", label: t("editHistory.fieldAmount") },
                                    { key: "status", label: t("editHistory.fieldStatus") },
                                  ]}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6">
                    <h3 className="mb-2 text-sm font-bold text-sea-800">{t("accounts.activityTimeline")}</h3>
                    {activity.length === 0 ? (
                      <p className="text-sm text-gray-400">{t("accounts.noActivityYet")}</p>
                    ) : (
                      <div className="flex flex-col">
                        {activity.map((item, i) => (
                          <div key={`${item.kind}-${item.data.id}`} className="flex gap-3">
                            <div className="flex w-4 shrink-0 flex-col items-center">
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  item.kind === "call" ? "bg-plum-500" : "bg-teal-500"
                                }`}
                              />
                              {i < activity.length - 1 && (
                                <div className="w-px flex-1 bg-gray-200" style={{ minHeight: 24 }} />
                              )}
                            </div>
                            <div className="pb-4 text-xs">
                              {item.kind === "visit" && (
                                <p className="text-gray-900">
                                  <span className="font-semibold">
                                    {item.data.rep?.full_name ?? t("roles.rep")}
                                  </span>{" "}
                                  {t("accounts.visited")} &middot;{" "}
                                  {item.data.outcome === "sold"
                                    ? t("accounts.outcomeSold")
                                    : t("accounts.outcomeNoSale")}
                                  {item.data.note ? ` — ${item.data.note}` : ""}
                                </p>
                              )}
                              {item.kind === "call" && (
                                <p className="text-gray-900">
                                  <span className="font-semibold">
                                    {item.data.telesales?.full_name ?? t("roles.telesales")}
                                  </span>{" "}
                                  {t("accounts.called")} &middot; {t(`callOutcome.${item.data.outcome}`)}
                                  {item.data.note ? ` — ${item.data.note}` : ""}
                                </p>
                              )}
                              {item.kind === "order" && (
                                <p className="flex items-center gap-1.5 text-gray-900">
                                  <TrendingUp size={12} className="text-teal-600" />
                                  {t("accounts.orderPlaced")} &middot;{" "}
                                  <span dir="ltr">{formatIQD(item.data.amount)}</span>
                                </p>
                              )}
                              <p className="mt-0.5 text-gray-400" dir="ltr">
                                {formatDateTime(item.at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showNew && (
        <AccountForm
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            void reload();
          }}
        />
      )}

      {editing && selected && (
        <AccountForm
          account={selected}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void reload();
          }}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={() => {
            setEditingOrder(null);
            if (id) void reloadActivity(id);
          }}
        />
      )}
    </div>
  );
}
