// Manager-only admin actions on rep accounts: create, deactivate,
// reactivate, reset password, change role.
//
// This MUST run server-side (Edge Function) because it uses the Supabase
// service-role key to call the Auth admin API. That key is never shipped
// to the browser. The caller's own JWT is used only to verify they are an
// active manager before any admin action runs.
//
// Deploy: supabase functions deploy manage-rep
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Missing Authorization header" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Identify the caller from their JWT, then verify manager status by
  // reading profiles directly with the service-role client (bypasses RLS,
  // so this check is authoritative regardless of RLS policy state).
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

  const { data: callerProfile, error: callerErr } = await admin
    .from("profiles")
    .select("role, active")
    .eq("id", userData.user.id)
    .single();

  if (callerErr || !callerProfile || callerProfile.role !== "manager" || !callerProfile.active) {
    return json({ error: "Manager role required" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action;

  try {
    switch (action) {
      case "create_rep": {
        const { email, password, full_name, phone, role } = body as {
          email: string;
          password: string;
          full_name: string;
          phone?: string;
          role?: "rep" | "manager";
        };
        if (!email || !password || !full_name) {
          return json({ error: "email, password and full_name are required" }, 400);
        }
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });
        if (createErr || !created.user) {
          return json({ error: createErr?.message ?? "Failed to create user" }, 400);
        }
        // handle_new_user trigger already inserted a default profile row
        // (role='rep', active=true) — fill in the real details.
        const { error: updateErr } = await admin
          .from("profiles")
          .update({ full_name, phone: phone ?? null, role: role ?? "rep" })
          .eq("id", created.user.id);
        if (updateErr) return json({ error: updateErr.message }, 400);
        return json({ id: created.user.id });
      }

      case "set_active": {
        const { rep_id, active } = body as { rep_id: string; active: boolean };
        if (!rep_id || typeof active !== "boolean") {
          return json({ error: "rep_id and active are required" }, 400);
        }
        // Lock the auth account itself, not just the profile flag, so a
        // deactivated rep truly cannot obtain a new session.
        const { error: banErr } = await admin.auth.admin.updateUserById(rep_id, {
          ban_duration: active ? "none" : "876000h",
        });
        if (banErr) return json({ error: banErr.message }, 400);
        const { error: profErr } = await admin.from("profiles").update({ active }).eq("id", rep_id);
        if (profErr) return json({ error: profErr.message }, 400);
        return json({ ok: true });
      }

      case "set_role": {
        const { rep_id, role } = body as { rep_id: string; role: "rep" | "manager" };
        if (!rep_id || (role !== "rep" && role !== "manager")) {
          return json({ error: "rep_id and a valid role are required" }, 400);
        }
        const { error: roleErr } = await admin.from("profiles").update({ role }).eq("id", rep_id);
        if (roleErr) return json({ error: roleErr.message }, 400);
        return json({ ok: true });
      }

      case "reset_password": {
        const { rep_id, new_password } = body as { rep_id: string; new_password: string };
        if (!rep_id || !new_password || new_password.length < 8) {
          return json({ error: "rep_id and a new_password of at least 8 characters are required" }, 400);
        }
        const { error: pwErr } = await admin.auth.admin.updateUserById(rep_id, { password: new_password });
        if (pwErr) return json({ error: pwErr.message }, 400);
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${String(action)}` }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
