import i18n from "../i18n";
import { supabase } from "./supabase";

/** Turn any thrown value into its technical message — for logs, never for a screen.
 *
 * Supabase-js throws plain objects (PostgrestError, StorageError — not `instanceof
 * Error`) as well as AuthError (which is), each carrying a `.message` string. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
}

function field(err: unknown, key: string): string | undefined {
  if (err && typeof err === "object" && key in err) {
    const v = (err as Record<string, unknown>)[key];
    return typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;
  }
  return undefined;
}

/** Fire-and-forget: the technical error goes to the console and, when signed in, to
 * client_error_log so a manager can see what failed on whose phone. Never throws. */
export function logClientError(err: unknown, context?: string): void {
  const message = errorMessage(err);
  console.error(`[flowercom]${context ? " " + context : ""}:`, err);
  try {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      void supabase!.from("client_error_log").insert({
        user_id: data.user.id,
        route: window.location.pathname,
        message: `${context ? context + ": " : ""}${message}`.slice(0, 2000),
        details: {
          code: field(err, "code"),
          status: field(err, "status"),
          details: field(err, "details"),
          hint: field(err, "hint"),
          name: field(err, "name"),
        },
        user_agent: navigator.userAgent.slice(0, 300),
      });
    });
  } catch {
    // logging must never be the thing that breaks
  }
}

/** What the person on the phone actually sees. The rule: a normal user is told
 * clearly whether the record was saved and what to do next — never a SQL/RLS/HTTP
 * message. Messages this app raised on purpose (our Edge Function's "You can't
 * deactivate your own account", a missing-config error) pass straight through. */
export function friendlyError(err: unknown, context?: string): string {
  logClientError(err, context);
  const t = i18n.t.bind(i18n);
  const msg = errorMessage(err);
  const code = field(err, "code") ?? "";
  const status = Number(field(err, "status") ?? 0);
  const isAuth = err instanceof Error && (err.name === "AuthApiError" || err.name === "AuthError" || "__isAuthError" in err);

  if (!navigator.onLine || /failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return t("errors.network");
  }
  if (isAuth) {
    if (status === 400 || /invalid login credentials/i.test(msg)) return t("errors.badCredentials");
    return t("errors.auth");
  }
  if (code === "23505") return t("errors.duplicate");
  if (code === "23514" || code === "22P02" || code === "23502") return t("errors.invalid");
  if (code === "42501" || /row-level security|permission denied/i.test(msg)) return t("errors.permission");
  if (code === "P0002" || code === "PGRST116") return t("errors.notFound");
  // Storage-service errors read like infrastructure ("The resource already exists") —
  // the person on the phone just needs "not saved, try again".
  if (err && typeof err === "object" && "__isStorageError" in err) return t("errors.generic");
  // Our own deliberate messages (thrown as plain Error by app code / the Edge Function
  // wrapper) are safe and useful to show verbatim.
  if (err instanceof Error && !code && !("hint" in err)) return msg;
  return t("errors.generic");
}
