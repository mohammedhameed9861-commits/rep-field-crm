import { supabase } from "./supabase";
import type { AppRole, Profile } from "./types";

/** All staff accounts (reps, telesales, managers) — used by the manager's Reps screen. */
export async function fetchStaff(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("active", { ascending: false })
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

async function callManageRep(body: Record<string, unknown>): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.functions.invoke("manage-rep", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function createStaffAccount(input: {
  email: string;
  password: string;
  full_name: string;
  role: AppRole;
}): Promise<void> {
  await callManageRep({ action: "create", ...input });
}

export async function setStaffActive(id: string, active: boolean): Promise<void> {
  await callManageRep({ action: "set_active", id, active });
}

export async function resetStaffPassword(id: string, password: string): Promise<void> {
  await callManageRep({ action: "reset_password", id, password });
}

export async function changeStaffRole(id: string, role: AppRole): Promise<void> {
  await callManageRep({ action: "change_role", id, role });
}
