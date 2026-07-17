import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [targetingId, setTargetingId] = useState<string | null>(null);
  const [newTarget, setNewTarget] = useState("");

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
      setError(err instanceof Error ? err.message : t("manageReps.errorCreate"));
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
      setError(err instanceof Error ? err.message : t("manageReps.errorStatus"));
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
      setError(err instanceof Error ? err.message : t("manageReps.errorRole"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(repId: string) {
    if (newPassword.length < 8) {
      setError(t("manageReps.passwordTooShort"));
      return;
    }
    setBusyId(repId);
    setError(null);
    try {
      await callManageRep({ action: "reset_password", rep_id: repId, new_password: newPassword });
      setResettingId(null);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("manageReps.errorPassword"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetTarget(repId: string) {
    const amount = newTarget.trim() === "" ? null : Number(newTarget);
    if (amount !== null && (Number.isNaN(amount) || amount < 0)) return;
    setBusyId(repId);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ daily_target: amount })
        .eq("id", repId);
      if (updateErr) throw new Error(updateErr.message);
      setTargetingId(null);
      setNewTarget("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("manageReps.errorTarget"));
    } finally {
      setBusyId(null);
    }
  }

  if (!profiles) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t("manageReps.title")}</h2>

      <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <h3 className="col-span-full font-semibold text-gray-900">{t("manageReps.addRep")}</h3>
        <input
          required
          placeholder={t("manageReps.fullName")}
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <input
          placeholder={t("manageReps.phone")}
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <input
          required
          type="email"
          placeholder={t("manageReps.email")}
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <input
          required
          type="password"
          placeholder={t("manageReps.tempPassword")}
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
          <option value="rep">{t("manageReps.rep")}</option>
          <option value="manager">{t("manageReps.manager")}</option>
        </select>
        <Button type="submit" disabled={creating} className="sm:col-span-2">
          {creating ? t("manageReps.creating") : t("manageReps.createAccount")}
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
                  <span className="ms-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                    {t("common.inactive")}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">{p.phone ?? t("common.noPhone")}</p>
              <p className="text-xs text-gray-400">
                {t("manageReps.dailyTarget")}: {p.daily_target != null ? p.daily_target.toLocaleString() : "—"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={p.role}
                disabled={busyId === p.id}
                onChange={(e) => handleSetRole(p.id, e.target.value as Role)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="rep">{t("manageReps.rep")}</option>
                <option value="manager">{t("manageReps.manager")}</option>
              </select>
              <button
                disabled={busyId === p.id}
                onClick={() => handleSetActive(p.id, !p.active)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium"
              >
                {p.active ? t("manageReps.deactivate") : t("manageReps.reactivate")}
              </button>
              {resettingId === p.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder={t("manageReps.newPassword")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    disabled={busyId === p.id}
                    onClick={() => handleResetPassword(p.id)}
                    className="rounded-lg bg-brand-600 px-3 py-1 text-sm font-medium text-white"
                  >
                    {busyId === p.id ? t("manageReps.saving") : t("common.save")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResettingId(p.id)}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium"
                >
                  {t("manageReps.resetPassword")}
                </button>
              )}
              {targetingId === p.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t("manageReps.dailyTarget")}
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    disabled={busyId === p.id}
                    onClick={() => handleSetTarget(p.id)}
                    className="rounded-lg bg-brand-600 px-3 py-1 text-sm font-medium text-white"
                  >
                    {busyId === p.id ? t("manageReps.saving") : t("common.save")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTargetingId(p.id);
                    setNewTarget(p.daily_target != null ? String(p.daily_target) : "");
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium"
                >
                  {t("manageReps.setTarget")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
