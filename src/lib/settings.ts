import { supabase } from "./supabase";
import type { AppSettings } from "./types";

export async function fetchSettings(): Promise<AppSettings> {
  if (!supabase) return { monthly_target_cartons: 1000 };
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", true).single();
  if (error) throw error;
  return data as AppSettings;
}

export async function updateMonthlyTarget(cartons: number): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("app_settings")
    .update({ monthly_target_cartons: cartons })
    .eq("id", true);
  if (error) throw error;
}
