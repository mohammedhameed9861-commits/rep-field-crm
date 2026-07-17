import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Users, Store, Package, Receipt, BarChart3, UserCog, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import clsx from "clsx";

const NAV = [
  { to: "/dashboard/overview", key: "nav.overview", icon: LayoutDashboard },
  { to: "/dashboard/reps", key: "nav.reps", icon: Users },
  { to: "/dashboard/shops", key: "nav.shops", icon: Store },
  { to: "/dashboard/products", key: "nav.products", icon: Package },
  { to: "/dashboard/invoices", key: "nav.invoices", icon: Receipt },
  { to: "/dashboard/analytics", key: "nav.analytics", icon: BarChart3 },
  { to: "/dashboard/reps/manage", key: "nav.manage", icon: UserCog },
] as const;

export function DashboardLayout() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-8">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{t("common.appName")}</h1>
          <p className="text-sm text-gray-500">{profile?.full_name}</p>
        </div>
        <div className="hidden items-center gap-1 md:flex">
          {NAV.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100",
                )
              }
            >
              <Icon className="h-4 w-4" /> {t(key)}
            </NavLink>
          ))}
          <LanguageSwitcher className="ms-2 flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-sm" />
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher className="p-2 text-gray-400" />
          <button onClick={signOut} className="p-2 text-gray-400" aria-label={t("common.signOut")}>
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <button onClick={signOut} className="hidden p-2 text-gray-400 md:block" aria-label={t("common.signOut")}>
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="p-4 md:p-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex overflow-x-auto border-t border-gray-200 bg-white md:hidden">
        {NAV.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex min-w-[64px] flex-1 flex-col items-center gap-1 py-2 text-xs",
                isActive ? "text-brand-700" : "text-gray-500",
              )
            }
          >
            <Icon className="h-5 w-5" />
            {t(key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
