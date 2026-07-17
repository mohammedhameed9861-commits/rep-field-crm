import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Login() {
  const { t } = useTranslation();
  const { session, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullScreenLoader />;
  if (session && profile) {
    return <Navigate to={profile.role === "manager" ? "/dashboard/overview" : "/visit/new"} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) setError(signInError.message);
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <h1 className="mb-1 text-2xl font-bold text-gray-900">{t("login.title")}</h1>
        <p className="mb-8 text-gray-500">{t("login.subtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
              {t("login.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="password">
              {t("login.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="tap-target w-full rounded-xl border border-gray-300 px-4 text-base"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? t("login.signingIn") : t("login.signIn")}
          </Button>
        </form>

        <p className="mt-6 text-xs text-gray-400">{t("login.footer")}</p>
      </div>
    </div>
  );
}
