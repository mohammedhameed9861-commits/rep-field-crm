import { friendlyError } from "../../lib/errors";
import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  createBoardColumn,
  deleteBoardColumn,
  fetchBoardColumns,
  renameBoardColumn,
  setAccountBoardColumn,
} from "../../lib/accountBoard";
import type { Account, BoardColumn } from "../../lib/types";

const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

/** A Kanban-style board next to the plain accounts list: managers name
 * columns (e.g. "Follow up", "VIP"), and any staff member can drag a shop
 * from the search list into one, or use the "Move to…" select on any card
 * — the same action either way, so it always works on a phone even though
 * true drag only works with a mouse. Never touches a shop's own data (see
 * migration 0018 / set_account_board_column) — only which column it's in. */
export default function AccountsBoard({
  accounts,
  isManager,
  onAccountMoved,
  onOpenAccount,
}: {
  accounts: Account[];
  isManager: boolean;
  onAccountMoved: (accountId: string, columnId: string | null) => void;
  onOpenAccount: (accountId: string) => void;
}) {
  const { t } = useTranslation();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<string | "unfiled" | null>(null);

  async function reloadColumns() {
    setLoading(true);
    try {
      setColumns(await fetchBoardColumns());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadColumns();
  }, []);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeAccounts;
    return activeAccounts.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.area ?? "").toLowerCase().includes(q),
    );
  }, [activeAccounts, search]);

  async function move(accountId: string, columnId: string | null) {
    setError(null);
    // Optimistic: the select/card should reflect the new column immediately,
    // not after a round trip — reverted automatically if the save fails.
    onAccountMoved(accountId, columnId);
    try {
      await setAccountBoardColumn(accountId, columnId);
    } catch (err) {
      setError(friendlyError(err));
      await reloadColumns();
    }
  }

  function onDragStart(e: DragEvent, accountId: string) {
    e.dataTransfer.setData("text/plain", accountId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: DragEvent, columnId: string | null) {
    e.preventDefault();
    setDragOverColumn(null);
    const accountId = e.dataTransfer.getData("text/plain");
    if (accountId) void move(accountId, columnId);
  }

  async function onAddColumn(e: FormEvent) {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const col = await createBoardColumn(newColumnName, columns.length);
      setColumns((prev) => [...prev, col]);
      setNewColumnName("");
      setAddingColumn(false);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRename(col: BoardColumn) {
    const name = renameValue.trim();
    if (!name || name === col.name) {
      setRenamingId(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await renameBoardColumn(col.id, name);
      setColumns((prev) => prev.map((c) => (c.id === col.id ? { ...c, name } : c)));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
      setRenamingId(null);
    }
  }

  async function onDeleteColumn(col: BoardColumn) {
    if (!confirm(t("board.deleteColumnConfirm", { name: col.name }))) return;
    setError(null);
    try {
      await deleteBoardColumn(col.id);
      setColumns((prev) => prev.filter((c) => c.id !== col.id));
      accounts.forEach((a) => {
        if (a.board_column_id === col.id) onAccountMoved(a.id, null);
      });
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  function ShopCard({ a }: { a: Account }) {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, a.id)}
        className="cursor-grab rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
      >
        <button
          onClick={() => onOpenAccount(a.id)}
          className="block text-start text-sm font-semibold text-gray-900 hover:text-teal-700"
        >
          {a.name}
        </button>
        <div className="mt-0.5 text-xs text-gray-400">{a.area ?? "—"}</div>
        <select
          value={a.board_column_id ?? ""}
          onChange={(e) => void move(a.id, e.target.value || null)}
          className="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-teal-400"
        >
          <option value="">{t("board.unfiled")}</option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
      {error && <p className="text-sm text-red-600 md:hidden">{error}</p>}

      {/* Left: every active shop — the drag source, and also a drop target for "un-file". */}
      <div className="flex h-64 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white md:h-auto md:w-[300px]">
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
          <p className="mt-2 text-[11px] leading-snug text-gray-400">{t("board.dragHint")}</p>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverColumn("unfiled");
          }}
          onDragLeave={() => setDragOverColumn((cur) => (cur === "unfiled" ? null : cur))}
          onDrop={(e) => onDrop(e, null)}
          className={`flex-1 overflow-y-auto p-2 ${dragOverColumn === "unfiled" ? "bg-teal-50/60" : ""}`}
        >
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-gray-400">{t("accounts.noAccountsYet")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((a) => (
                <ShopCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: manager-named columns. */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {error && <p className="hidden text-sm text-red-600 md:block">{error}</p>}
        {loading ? (
          <p className="p-3 text-sm text-gray-400">{t("common.loading")}</p>
        ) : columns.length === 0 && !isManager ? (
          <p className="p-3 text-sm text-gray-400">{t("board.noColumnsYet")}</p>
        ) : (
          <>
            {columns.map((col) => {
              const shops = activeAccounts.filter((a) => a.board_column_id === col.id);
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverColumn(col.id);
                  }}
                  onDragLeave={() => setDragOverColumn((cur) => (cur === col.id ? null : cur))}
                  onDrop={(e) => onDrop(e, col.id)}
                  className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-gray-50 ${
                    dragOverColumn === col.id ? "border-teal-400 bg-teal-50/50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-gray-200 p-3">
                    {renamingId === col.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => onRename(col)}
                        onKeyDown={(e) => e.key === "Enter" && onRename(col)}
                        disabled={busy}
                        className={field}
                      />
                    ) : (
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-900">{col.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {t(shops.length === 1 ? "board.shopCountOne" : "board.shopCountOther", {
                            count: shops.length,
                          })}
                        </div>
                      </div>
                    )}
                    {isManager && renamingId !== col.id && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => {
                            setRenamingId(col.id);
                            setRenameValue(col.name);
                          }}
                          aria-label={t("board.renameColumn")}
                          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => onDeleteColumn(col)}
                          aria-label={t("board.deleteColumn")}
                          className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto p-2">
                    {shops.map((a) => (
                      <ShopCard key={a.id} a={a} />
                    ))}
                  </div>
                </div>
              );
            })}

            {isManager && columns.length === 0 && !addingColumn && (
              <p className="w-64 shrink-0 self-center text-sm text-gray-400">{t("board.noColumnsYetManager")}</p>
            )}

            {isManager &&
              (addingColumn ? (
                <form
                  onSubmit={onAddColumn}
                  className="h-fit w-64 shrink-0 rounded-2xl border border-dashed border-teal-300 bg-white p-3"
                >
                  <input
                    autoFocus
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder={t("board.columnNamePlaceholder")}
                    className={field}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={busy || !newColumnName.trim()}
                      className="flex-1 rounded-full bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
                    >
                      {t("common.add")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingColumn(false);
                        setNewColumnName("");
                      }}
                      className="flex-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="flex h-24 w-64 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-teal-300 hover:text-teal-600"
                >
                  <Plus size={16} /> {t("board.addColumn")}
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
