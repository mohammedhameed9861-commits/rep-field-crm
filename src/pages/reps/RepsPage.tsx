import { useEffect, useState } from "react";
import { KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { fetchStaff, resetStaffPassword, setStaffActive } from "../../lib/reps";
import type { AppRole, Profile } from "../../lib/types";
import { formatDate } from "../../lib/format";
import StaffForm from "./StaffForm";

const ROLE_BADGE: Record<AppRole, string> = {
  rep: "bg-teal-100 text-teal-700",
  telesales: "bg-plum-100 text-plum-500",
  manager: "bg-sea-100 text-sea-700",
};

export default function RepsPage() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setStaff(await fetchStaff());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function toggleActive(person: Profile) {
    const verb = person.active ? "deactivate" : "reactivate";
    if (!confirm(`${verb === "deactivate" ? "Deactivate" : "Reactivate"} ${person.full_name}?`)) return;
    try {
      await setStaffActive(person.id, !person.active);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function resetPassword(person: Profile) {
    const password = prompt(`New temporary password for ${person.full_name}:`);
    if (!password) return;
    try {
      await resetStaffPassword(person.id, password);
      alert("Password reset. Share the new password with them directly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (profile?.role !== "manager") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Only managers can manage staff accounts.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">Reps &amp; Staff</h1>
          <p className="mt-0.5 text-sm text-gray-500">{staff.length} accounts</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[1fr_110px_100px_110px_1fr] gap-2 border-b border-gray-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <span>Name</span>
            <span>Role</span>
            <span>Status</span>
            <span>Since</span>
            <span className="text-end">Actions</span>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-gray-400">Loading…</p>
          ) : staff.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No staff accounts yet.</p>
          ) : (
            staff.map((p) => (
              <div
                key={p.id}
                className={`grid grid-cols-[1fr_110px_100px_110px_1fr] items-center gap-2 border-t border-gray-100 px-4 py-3 ${
                  !p.active ? "opacity-50" : ""
                }`}
              >
                <span className="text-sm font-semibold text-gray-900">{p.full_name}</span>
                <span
                  className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize ${ROLE_BADGE[p.role]}`}
                >
                  {p.role}
                </span>
                <span
                  className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                    p.active ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.active ? "Active" : "Inactive"}
                </span>
                <span className="text-xs text-gray-500">{formatDate(p.created_at)}</span>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => void resetPassword(p)}
                    title="Reset password"
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    <KeyRound size={13} /> Reset
                  </button>
                  <button
                    onClick={() => void toggleActive(p)}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    {p.active ? (
                      <>
                        <UserX size={13} /> Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck size={13} /> Reactivate
                      </>
                    )}
                  </button>
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
