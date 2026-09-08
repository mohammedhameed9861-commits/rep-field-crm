// Admin actions on staff accounts (create, deactivate/reactivate, reset
// password, change role) — anything needing the Auth admin API, which
// needs the service-role key. That key must never reach the browser, so
// this all runs server-side here instead.
//
// Every call re-checks that the caller is an active manager, using the
// caller's own JWT against a client scoped to their permissions (not the
// service-role client) — so this function can't be used by anyone who
// isn't already a manager, no matter what it's asked to do.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Caller-scoped client — respects RLS, identifies who's actually calling.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await callerClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .single();
    if (!callerProfile || callerProfile.role !== "manager" || !callerProfile.active) {
      return json({ error: "Only an active manager can do this" }, 403);
    }

    // Service-role client — only reached after the manager check above.
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, full_name, role } = body;
      if (!email || !password || !full_name || !role) {
        return json({ error: "Missing required fields" }, 400);
      }
      if (!["rep", "telesales", "manager"].includes(role)) {
        return json({ error: "Invalid role" }, 400);
      }
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createError) return json({ error: createError.message }, 400);

      // The new-user trigger always inserts role='rep' — set the real
      // role here, server-side, only after the manager check above.
      if (role !== "rep") {
        const { error: roleError } = await admin
          .from("profiles")
          .update({ role })
          .eq("id", created.user.id);
        if (roleError) return json({ error: roleError.message }, 400);
      }
      return json({ ok: true, id: created.user.id });
    }

    if (action === "set_active") {
      const { id, active } = body;
      if (!id || typeof active !== "boolean") return json({ error: "Missing fields" }, 400);
      const { error } = await admin.from("profiles").update({ active }).eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { id, password } = body;
      if (!id || !password) return json({ error: "Missing fields" }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "change_role") {
      const { id, role } = body;
      if (!id || !["rep", "telesales", "manager"].includes(role)) {
        return json({ error: "Missing or invalid fields" }, 400);
      }
      const { error } = await admin.from("profiles").update({ role }).eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
