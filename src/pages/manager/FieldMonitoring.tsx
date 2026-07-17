import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import type { Shop, Visit } from "@/types/database";

type VisitRow = Visit & {
  shops: { shop_name: string; lat: number | null; lng: number | null; classification: Shop["classification"] } | null;
  profiles: { full_name: string } | null;
};

type FlagKind = "rapid" | "mismatch" | "repeatedGps";

interface FlaggedVisit {
  visit: VisitRow;
  flags: FlagKind[];
}

const MISMATCH_METERS = 300;
const DUPLICATE_GPS_METERS = 50;
const RAPID_MINUTES = 3;
const SUSPICIOUS_WINDOW_DAYS = 60;
const MISSED_SHOP_DAYS = 14;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function startOfDay(offsetDays: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

const FLAG_STYLES: Record<FlagKind, string> = {
  rapid: "bg-amber-100 text-amber-700",
  mismatch: "bg-red-100 text-red-700",
  repeatedGps: "bg-purple-100 text-purple-700",
};

export function FieldMonitoring() {
  const { t } = useTranslation();
  const [visits, setVisits] = useState<VisitRow[] | null>(null);
  const [shops, setShops] = useState<Shop[] | null>(null);

  useEffect(() => {
    supabase
      .from("visits")
      .select("*, shops(shop_name, lat, lng, classification), profiles(full_name)")
      .order("visit_time", { ascending: true })
      .then(({ data }) => setVisits((data as VisitRow[]) ?? []));
    supabase
      .from("shops")
      .select("*")
      .then(({ data }) => setShops(data ?? []));
  }, []);

  const loaded = visits && shops;

  const suspicious = useMemo(() => {
    if (!loaded) return [];
    const windowStart = startOfDay(SUSPICIOUS_WINDOW_DAYS);
    const recent = visits.filter((v) => new Date(v.visit_time) >= windowStart);
    const flagsByVisit = new Map<string, Set<FlagKind>>();
    const flag = (id: string, kind: FlagKind) => {
      if (!flagsByVisit.has(id)) flagsByVisit.set(id, new Set());
      flagsByVisit.get(id)!.add(kind);
    };

    // Location mismatch: visit GPS far from the shop's recorded location.
    for (const v of recent) {
      if (v.shops?.lat == null || v.shops?.lng == null) continue;
      const distance = haversineMeters(Number(v.gps_lat), Number(v.gps_lng), Number(v.shops.lat), Number(v.shops.lng));
      if (distance > MISMATCH_METERS) flag(v.id, "mismatch");
    }

    // Group by rep for the pairwise checks below.
    const byRep = new Map<string, VisitRow[]>();
    for (const v of recent) {
      if (!byRep.has(v.rep_id)) byRep.set(v.rep_id, []);
      byRep.get(v.rep_id)!.push(v);
    }

    for (const repVisits of byRep.values()) {
      // Already sorted by visit_time ascending (query order).
      for (let i = 1; i < repVisits.length; i++) {
        const prev = repVisits[i - 1];
        const curr = repVisits[i];
        const minutesApart = (new Date(curr.visit_time).getTime() - new Date(prev.visit_time).getTime()) / 60_000;
        if (minutesApart < RAPID_MINUTES) {
          flag(prev.id, "rapid");
          flag(curr.id, "rapid");
        }
      }

      // Same rep, different shops, near-identical GPS.
      for (let i = 0; i < repVisits.length; i++) {
        for (let j = i + 1; j < repVisits.length; j++) {
          const a = repVisits[i];
          const b = repVisits[j];
          if (a.shop_id === b.shop_id) continue;
          const distance = haversineMeters(Number(a.gps_lat), Number(a.gps_lng), Number(b.gps_lat), Number(b.gps_lng));
          if (distance < DUPLICATE_GPS_METERS) {
            flag(a.id, "repeatedGps");
            flag(b.id, "repeatedGps");
          }
        }
      }
    }

    const result: FlaggedVisit[] = recent
      .filter((v) => flagsByVisit.has(v.id))
      .map((v) => ({ visit: v, flags: [...flagsByVisit.get(v.id)!] }));
    result.sort((a, b) => new Date(b.visit.visit_time).getTime() - new Date(a.visit.visit_time).getTime());
    return result;
  }, [loaded, visits]);

  const missedShops = useMemo(() => {
    if (!loaded) return [];
    const lastVisitByShop = new Map<string, string>();
    for (const v of visits) {
      const existing = lastVisitByShop.get(v.shop_id);
      if (!existing || new Date(v.visit_time) > new Date(existing)) {
        lastVisitByShop.set(v.shop_id, v.visit_time);
      }
    }
    const threshold = startOfDay(MISSED_SHOP_DAYS);
    return shops
      .map((s) => {
        const last = lastVisitByShop.get(s.id) ?? null;
        const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000) : null;
        return { shop: s, last, daysSince };
      })
      .filter((r) => r.last === null || new Date(r.last) < threshold)
      .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));
  }, [loaded, visits, shops]);

  if (!loaded) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{t("fieldMonitoring.title")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("fieldMonitoring.disclaimer")}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("fieldMonitoring.suspiciousVisits")}
        </h3>
        {suspicious.length === 0 ? (
          <p className="text-sm text-gray-400">{t("fieldMonitoring.noSuspicious")}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {suspicious.map(({ visit, flags }) => (
              <li key={visit.id} className="py-3">
                <Link
                  to={`/dashboard/visit/${visit.id}`}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {visit.profiles?.full_name} · {visit.shops?.shop_name}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(visit.visit_time).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 ps-6 sm:ps-0">
                    {flags.map((f) => (
                      <span key={f} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${FLAG_STYLES[f]}`}>
                        {t(`fieldMonitoring.flag_${f}`)}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("fieldMonitoring.missedShops")}
        </h3>
        {missedShops.length === 0 ? (
          <p className="text-sm text-gray-400">{t("fieldMonitoring.noMissedShops")}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <ul className="divide-y divide-gray-100">
              {missedShops.map(({ shop, daysSince }) => (
                <li key={shop.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ClassificationBadge classification={shop.classification} />
                    <Link to={`/dashboard/shops/${shop.id}`} className="font-medium text-brand-700">
                      {shop.shop_name}
                    </Link>
                  </div>
                  <span className="text-gray-500">
                    {daysSince == null ? t("analytics.neverVisited") : t("analytics.daysAgo", { count: daysSince })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
