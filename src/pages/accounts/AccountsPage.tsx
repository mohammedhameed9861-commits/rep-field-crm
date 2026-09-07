import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, MapPin, Pencil, Phone, Plus, Search, TrendingUp, User } from "lucide-react";
import { fetchAccounts, fetchAccountActivity, setAccountActive } from "../../lib/accounts";
import { formatDate, formatDateTime, formatIQD, timeAgo } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import type { Account, ActivityItem, OrderRow, ShopClass } from "../../lib/types";
import { SHOP_CLASS_LABEL } from "../../lib/types";
import AccountForm from "./AccountForm";

const CLASS_BADGE: Record<ShopClass, string> = {
  A: "bg-teal-100 text-teal-700",
  B: "bg-sea-100 text-sea-700",
  C: "bg-gray-100 text-gray-600",
};

export default function AccountsPage() {
  const { profile } = useAuth();
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
    const verb = account.active ? "archive" : "reactivate";
    if (!confirm(`${verb === "archive" ? "Archive" : "Reactivate"} ${account.name}?`)) return;
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
    let alive = true;
    setDetailLoading(true);
    fetchAccountActivity(id)
      .then(({ orders, activity }) => {
        if (!alive) return;
        setOrders(orders);
        setActivity(activity);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setDetailLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const totalOrders = orders.length;
  const lifetimeBouquets = orders.reduce((sum, o) => sum + Number(o.quantity), 0);
  const lastActivity = activity[0]?.at;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">Accounts</h1>
          <p className="mt-0.5 text-sm text-gray-500">{accounts.length} client shops</p>
        </div>
        {profile?.role === "manager" && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            <Plus size={16} /> Add Account
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
                placeholder="Search accounts…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <p className="p-3 text-sm text-gray-400">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-3 text-sm text-gray-400">No accounts yet.</p>
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
                        Inactive
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
              Select an account to see its history.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-sea-800">{selected.name}</h2>
                    {!selected.active && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-500">
                        Inactive
                      </span>
                    )}
                    {selected.shop_class && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CLASS_BADGE[selected.shop_class]}`}
                      >
                        {SHOP_CLASS_LABEL[selected.shop_class]}
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
                      {selected.assigned_rep?.full_name ?? "Unassigned"}
                    </span>
                  </div>
                </div>
                {profile?.role === "manager" && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => void toggleActive(selected)}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      {selected.active ? (
                        <>
                          <Archive size={13} /> Archive
                        </>
                      ) : (
                        <>
                          <ArchiveRestore size={13} /> Reactivate
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-4">
                <div>
                  <div className="text-[11px] font-semibold text-gray-500">Total Orders</div>
                  <div className="mt-0.5 text-lg font-bold text-sea-800">{totalOrders}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500">Total Bouquets</div>
                  <div className="mt-0.5 text-lg font-bold text-sea-800">
                    {lifetimeBouquets} bouquet{lifetimeBouquets === 1 ? "" : "s"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500">Last Activity</div>
                  <div className="mt-0.5 text-lg font-bold text-sea-800">
                    {lastActivity ? timeAgo(lastActivity) : "—"}
                  </div>
                </div>
              </div>

              {detailLoading ? (
                <p className="pt-6 text-sm text-gray-400">Loading…</p>
              ) : (
                <>
                  <div className="pt-5">
                    <h3 className="mb-2 text-sm font-bold text-sea-800">Order History</h3>
                    {orders.length === 0 ? (
                      <p className="text-sm text-gray-400">No orders yet.</p>
                    ) : (
                      <div className="flex flex-col">
                        <div className="grid grid-cols-[100px_1fr_120px_100px] gap-2 px-1 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          <span>Date</span>
                          <span>Items</span>
                          <span>Amount</span>
                          <span>Status</span>
                        </div>
                        {orders.map((o) => (
                          <div
                            key={o.id}
                            className="grid grid-cols-[100px_1fr_120px_100px] items-center gap-2 border-t border-gray-100 px-1 py-2.5"
                          >
                            <span className="text-xs text-gray-600">{formatDate(o.created_at)}</span>
                            <span className="truncate text-xs text-gray-900">{o.items}</span>
                            <span className="text-xs font-semibold text-gray-900">
                              {formatIQD(o.amount)}
                            </span>
                            <span
                              className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                                o.status === "delivered"
                                  ? "bg-teal-50 text-teal-700"
                                  : o.status === "cancelled"
                                    ? "bg-gray-100 text-gray-500"
                                    : "bg-warn-100 text-warn-600"
                              }`}
                            >
                              {o.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6">
                    <h3 className="mb-2 text-sm font-bold text-sea-800">Activity Timeline</h3>
                    {activity.length === 0 ? (
                      <p className="text-sm text-gray-400">No visits or calls logged yet.</p>
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
                                    {item.data.rep?.full_name ?? "A rep"}
                                  </span>{" "}
                                  visited &middot;{" "}
                                  {item.data.outcome === "sold" ? "sold" : "no sale"}
                                  {item.data.note ? ` — ${item.data.note}` : ""}
                                </p>
                              )}
                              {item.kind === "call" && (
                                <p className="text-gray-900">
                                  <span className="font-semibold">
                                    {item.data.telesales?.full_name ?? "Telesales"}
                                  </span>{" "}
                                  called &middot; {item.data.outcome.replace("_", " ")}
                                  {item.data.note ? ` — ${item.data.note}` : ""}
                                </p>
                              )}
                              {item.kind === "order" && (
                                <p className="flex items-center gap-1.5 text-gray-900">
                                  <TrendingUp size={12} className="text-teal-600" />
                                  Order placed &middot; {formatIQD(item.data.amount)}
                                </p>
                              )}
                              <p className="mt-0.5 text-gray-400">{formatDateTime(item.at)}</p>
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
    </div>
  );
}
