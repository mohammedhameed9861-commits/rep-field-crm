import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

/** Below `md`, the sidebar used to sit permanently at a fixed 224px — on a phone
 * that's over half the screen, squeezing every page's content into a sliver
 * (words wrapping one per line). Now it's a slide-in drawer behind a hamburger,
 * same as any mobile app nav; `md:` and up keeps the old always-visible sidebar. */
export default function Layout() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // A nav link click already closes the drawer (see Sidebar's onNavigate), but this
  // covers any other way the route could change (e.g. clicking a card in the page itself).
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-[100dvh] flex-col bg-cream-50 text-gray-900 md:flex-row">
      <div className="flex shrink-0 items-center justify-between border-b border-sea-700 bg-sea-800 px-4 py-3 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1 text-white"
          aria-label={t("common.openMenu")}
        >
          <Menu size={22} />
        </button>
        <div className="text-sm font-bold tracking-wide text-white">FLOWERCOM</div>
        <div className="w-[30px]" />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div
        className={`fixed inset-y-0 z-50 flex h-full transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"
        } start-0`}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!online && (
          <div className="shrink-0 bg-warn-600 px-4 py-2 text-center text-xs font-semibold text-white">
            {t("errors.offlineBanner")}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
