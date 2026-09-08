import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabase";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();
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

  // The database already refuses a deactivated account everything (my_role() returns
  // null once active=false), so without this they'd just see every screen fail with
  // permission errors and no idea why.
  if (profile && !profile.active) {
    return <BlockedScreen message={t("auth.deactivated")} onSignOut={signOut} signOutLabel={t("common.signOut")} />;
  }
  if (!profile) {
    return <BlockedScreen message={t("auth.profileMissing")} onSignOut={signOut} signOutLabel={t("common.signOut")} />;
  }

  return <>{children}</>;
}

function BlockedScreen({
  message,
  onSignOut,
  signOutLabel,
}: {
  message: string;
  onSignOut: () => Promise<void>;
  signOutLabel: string;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-sm text-gray-600">{message}</p>
      <button
        onClick={() => void onSignOut()}
        className="mt-6 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
      >
        {signOutLabel}
      </button>
    </div>
  );
}
