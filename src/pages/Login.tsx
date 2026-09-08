import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { session } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="flex h-screen items-center justify-center bg-cream-50">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M13 2C18 6 19 12 13 24C7 12 8 6 13 2Z" stroke="#0b4c49" strokeWidth="1.3" />
          </svg>
          <div className="leading-tight">
            <div className="text-sm font-bold text-sea-800">FLOWERCOM</div>
            <div className="text-[10px] font-normal tracking-widest text-sea-500">CRM</div>
          </div>
        </div>
        <h1 className="text-lg font-bold text-sea-800">{t("login.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("login.subtitle")}</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            placeholder={t("login.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            dir="ltr"
          />
          <input
            type="password"
            required
            placeholder={t("login.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            dir="ltr"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-teal-500 px-6 py-3 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {busy ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
