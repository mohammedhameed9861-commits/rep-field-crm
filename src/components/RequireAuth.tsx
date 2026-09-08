import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabase";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { t } = useTranslation();

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-xl font-bold text-sea-800">{t("notConnected.title")}</h1>
        <p className="mt-3 text-gray-600">
          {t("notConnected.body")}{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5" dir="ltr">
            VITE_SUPABASE_URL
          </code>{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5" dir="ltr">
            VITE_SUPABASE_ANON_KEY
          </code>
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="px-6 py-24 text-center text-gray-400">{t("common.loading")}</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
