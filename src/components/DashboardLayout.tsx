import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, Store, UserCog, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import clsx from "clsx";

const NAV = [
  { to: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/reps", label: "Reps", icon: Users },
  { to: "/dashboard/shops", label: "Shops", icon: Store },
  { to: "/dashboard/reps/manage", label: "Manage", icon: UserCog },
];

export function DashboardLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-8">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Rep Field CRM</h1>
          <p className="text-sm text-gray-500">{profile?.full_name}</p>
        </div>
        <div className="hidden gap-1 md:flex">
          {NAV.map(({ to, label, icon: Icon }) => (
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
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </div>
        <button onClick={signOut} className="p-2 text-gray-400" aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="p-4 md:p-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-gray-200 bg-white md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                isActive ? "text-brand-700" : "text-gray-500",
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
