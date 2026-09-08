import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Camera,
  History,
  LayoutGrid,
  Users,
  TrendingUp,
  Phone,
  PhoneCall,
  Boxes,
  Download,
  Images,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { setLanguage } from "../i18n";

const managerNav = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutGrid, end: true },
  { to: "/accounts", labelKey: "nav.accounts", icon: Users },
  { to: "/reps", labelKey: "nav.reps", icon: TrendingUp },
  { to: "/visits-activity", labelKey: "nav.visitsActivity", icon: Images },
  { to: "/telesales", labelKey: "nav.telesales", icon: Phone },
  { to: "/inventory", labelKey: "nav.inventory", icon: Boxes },
  { to: "/pull-data", labelKey: "nav.pullData", icon: Download },
];

// Reps live in the field day-to-day — their nav is just logging visits and
// checking their own history, not the manager-facing screens above.
const repNav = [
  { to: "/visits/new", labelKey: "nav.newVisit", icon: Camera, end: true },
  { to: "/visits", labelKey: "nav.myVisits", icon: History },
];

// Telesales works the phones — same idea as reps, just calls instead of visits.
const telesalesNav = [
  { to: "/calls/new", labelKey: "nav.newCall", icon: PhoneCall, end: true },
  { to: "/calls", labelKey: "nav.myCalls", icon: History },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const navItems =
    profile?.role === "rep" ? repNav : profile?.role === "telesales" ? telesalesNav : managerNav;

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto bg-sea-800 px-4 py-6">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
          <path d="M13 2C18 6 19 12 13 24C7 12 8 6 13 2Z" stroke="#ffffff" strokeWidth="1.3" />
        </svg>
        <div className="leading-tight text-white">
          <div className="text-sm font-bold tracking-wide">FLOWERCOM</div>
          <div className="text-[10px] font-normal tracking-widest text-teal-300">CRM</div>
        </div>
      </div>

      {navItems.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm ${
              isActive ? "bg-sea-700 font-semibold text-white" : "text-sea-100 hover:bg-sea-700/50"
            }`
          }
        >
          <Icon size={18} strokeWidth={1.8} />
          {t(labelKey)}
        </NavLink>
      ))}

      <div className="flex-1" />

      <button
        onClick={() => setLanguage(isRtl ? "en" : "ar")}
        className="rounded-lg px-3 py-2 text-start text-xs font-semibold text-sea-200 hover:bg-sea-700 hover:text-white"
      >
        {isRtl ? "English" : "العربية"}
      </button>

      <div className="flex items-center gap-2.5 border-t border-sea-600 pt-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
          {initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-xs font-semibold text-white">
            {profile?.full_name ?? "…"}
          </span>
          <span className="text-[11px] text-teal-300">{profile ? t(`roles.${profile.role}`) : ""}</span>
        </div>
        <button
          onClick={() => void signOut()}
          className="rounded-md px-2 py-1 text-[11px] font-semibold text-sea-200 hover:bg-sea-700 hover:text-white"
        >
          {t("common.signOut")}
        </button>
      </div>
    </div>
  );
}
