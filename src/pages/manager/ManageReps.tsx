import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { Button } from "@/components/Button";
import type { Profile, Role } from "@/types/database";

async function callManageRep(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-rep", { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function ManageReps() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "", role: "rep" as Role });
  const [creating, setCreating] = useState(false);

  function refresh() {
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setProfiles(data ?? []));
  }

  useEffect(refresh, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await callManageRep({ action: "create_rep", ...form });
      setForm({ full_name: "", phone: "", email: "", password: "", role: "rep" });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rep");
    } finally {
      setCreating(false);
    }
  }

  async function handleSetActive(repId: string, active: boolean) {
    setBusyId(repId);
    setError(null);
    try {
      await callManageRep({ action: "set_active", rep_id: repId, active });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetRole(repId: string, role: Role) {
    setBusyId(repId);
    setError(null);
    try {
      await callManageRep({ action: "set_role", rep_id: repId, role });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(repId: string) {
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    setBusyId(repId);
    setError(null);
    try {
      await callManageRep({ action: "reset_password", rep_id: repId, new_password: newPassword });
      setResettingId(null);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusyId(null);
    }
  }

  if (!profiles) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Manage Reps</h2>

      <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <h3 className="col-span-full font-semibold text-gray-900">Add rep</h3>
        <input
          required
          placeholder="Full name"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <input
          required
          type="password"
          placeholder="Temporary password"
          minLength={8}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        >
          <option value="rep">Rep</option>
          <option value="manager">Manager</option>
        </select>
        <Button type="submit" disabled={creating} className="sm:col-span-2">
          {creating ? "Creating..." : "Create account"}
        </Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {profiles.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {p.full_name}
                {!p.active && (
                  <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">inactive</span>
                )}
              </p>
              <p className="text-sm text-gray-500">{p.phone ?? "No phone"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={p.role}
                disabled={busyId === p.id}
                onChange={(e) => handleSetRole(p.id, e.target.value as Role)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="rep">Rep</option>
                <option value="manager">Manager</option>
              </select>
              <button
                disabled={busyId === p.id}
                onClick={() => handleSetActive(p.id, !p.active)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium"
              >
                {p.active ? "Deactivate" : "Reactivate"}
              </button>
              {resettingId === p.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    disabled={busyId === p.id}
                    onClick={() => handleResetPassword(p.id)}
                    className="rounded-lg bg-brand-600 px-3 py-1 text-sm font-medium text-white"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResettingId(p.id)}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium"
                >
                  Reset password
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
