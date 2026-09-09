import { friendlyError } from "../../lib/errors";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { fetchStaff, resetStaffPassword, setStaffActive, setStaffName } from "../../lib/reps";
import type { AppRole, Profile } from "../../lib/types";
import { formatDate } from "../../lib/format";
import StaffForm from "./StaffForm";
import EditHistoryButton from "../../components/EditHistoryButton";

const ROLE_BADGE: Record<AppRole, string> = {
  rep: "bg-teal-100 text-teal-700",
  telesales: "bg-plum-100 text-plum-500",
  manager: "bg-sea-100 text-sea-700",
};

export default function RepsPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editingNameFor, setEditingNameFor] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setStaff(await fetchStaff());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function toggleActive(person: Profile) {
    const key = person.active ? "reps.deactivateConfirm" : "reps.reactivateConfirm";
    if (!confirm(t(key, { name: person.full_name }))) return;
    try {
      await setStaffActive(person.id, !person.active);
      await reload();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function saveName(person: Profile) {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await setStaffName(person.id, nameInput.trim());
      setEditingNameFor(null);
      await reload();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSavingName(false);
    }
  }

  async function resetPassword(person: Profile) {
    const password = prompt(t("reps.resetPrompt", { name: person.full_name }));
    if (!password) return;
    try {
      await resetStaffPassword(person.id, password);
      alert(t("reps.resetSuccess"));
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  if (profile?.role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        {t("reps.managerOnly")}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 md:px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">{t("reps.title")}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t(staff.length === 1 ? "reps.countOne" : "reps.countOther", { count: staff.length })}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <Plus size={16} /> {t("reps.addStaff")}
        </button>
      </div>

      {error && <p className="px-4 md:px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-7 pb-6">
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <div className="min-w-[640px] grid grid-cols-[1fr_110px_100px_110px_1fr] gap-2 border-b border-gray-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <span>{t("reps.colName")}</span>
            <span>{t("reps.colRole")}</span>
            <span>{t("reps.colStatus")}</span>
            <span>{t("reps.colSince")}</span>
            <span className="text-end">{t("reps.colActions")}</span>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-gray-400">{t("common.loading")}</p>
          ) : staff.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t("reps.noStaffYet")}</p>
          ) : (
            staff.map((p) => (
              <div
                key={p.id}
                className={`min-w-[640px] grid grid-cols-[1fr_110px_100px_110px_1fr] items-center gap-2 border-t border-gray-100 px-4 py-3 ${
                  !p.active ? "opacity-50" : ""
                }`}
              >
                {editingNameFor === p.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-teal-400"
                      autoFocus
                    />
                    <button
                      onClick={() => void saveName(p)}
                      disabled={savingName}
                      className="shrink-0 rounded bg-teal-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
                    >
                      {t("common.save")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingNameFor(p.id);
                      setNameInput(p.full_name);
                    }}
                    className="group flex w-fit items-center gap-1.5 text-start text-sm font-semibold text-gray-900"
                  >
                    {p.full_name}
                    <Pencil size={11} className="text-gray-300 opacity-0 group-hover:opacity-100" />
                  </button>
                )}
                <span
                  className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] font-bold ${ROLE_BADGE[p.role]}`}
                >
                  {t(`roles.${p.role}`)}
                </span>
                <span
                  className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                    p.active ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.active ? t("reps.active") : t("reps.inactive")}
                </span>
                <span className="text-xs text-gray-500" dir="ltr">
                  {formatDate(p.created_at)}
                </span>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => void resetPassword(p)}
                      title={t("reps.reset")}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <KeyRound size={13} /> {t("reps.reset")}
                    </button>
                    <button
                      onClick={() => void toggleActive(p)}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      {p.active ? (
                        <>
                          <UserX size={13} /> {t("reps.deactivate")}
                        </>
                      ) : (
                        <>
                          <UserCheck size={13} /> {t("reps.reactivate")}
                        </>
                      )}
                    </button>
                  </div>
                  <EditHistoryButton
                    tableName="profiles"
                    recordId={p.id}
                    fields={[
                      { key: "full_name", label: t("editHistory.fieldName") },
                      { key: "role", label: t("reps.colRole") },
                      { key: "active", label: t("reps.colStatus") },
                      { key: "monthly_target_cartons", label: t("dashboard.manager.target") },
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showNew && (
        <StaffForm
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}
