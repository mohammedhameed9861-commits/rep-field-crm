import { NavLink } from "react-router-dom";
import { LayoutGrid, Users, TrendingUp, Phone, Boxes } from "lucide-react";
import { useAuth } from "../lib/auth";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/accounts", label: "Accounts", icon: Users },
  { to: "/reps", label: "Reps", icon: TrendingUp },
  { to: "/telesales", label: "Telesales", icon: Phone },
  { to: "/inventory", label: "Inventory", icon: Boxes },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex w-56 shrink-0 flex-col gap-1 bg-sea-800 px-4 py-6">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
          <path d="M13 2C18 6 19 12 13 24C7 12 8 6 13 2Z" stroke="#ffffff" strokeWidth="1.3" />
        </svg>
        <div className="leading-tight text-white">
          <div className="text-sm font-bold tracking-wide">FLOWERCOM</div>
          <div className="text-[10px] font-normal tracking-widest text-teal-300">CRM</div>
        </div>
      </div>

      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm ${
              isActive ? "bg-sea-700 font-semibold text-white" : "text-sea-100 hover:bg-sea-700/50"
            }`
          }
        >
          <Icon size={18} strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 border-t border-sea-600 pt-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
          {initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-xs font-semibold text-white">
            {profile?.full_name ?? "…"}
          </span>
          <span className="text-[11px] capitalize text-teal-300">{profile?.role}</span>
        </div>
        <button
          onClick={() => void signOut()}
          className="rounded-md px-2 py-1 text-[11px] font-semibold text-sea-200 hover:bg-sea-700 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
