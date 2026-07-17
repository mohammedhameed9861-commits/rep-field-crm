import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { ClassificationBadge } from "@/components/ClassificationBadge";
import type { OrderItem, Product, Profile, Shop, ShopClassification, Visit } from "@/types/database";

type OrderItemRow = OrderItem & {
  products: { name: string; category: string | null; active: boolean } | null;
  visits: { visit_time: string } | null;
};

function startOfDay(offsetDays: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function SalesTrendChart({ days }: { days: { key: string; label: string; revenue: number }[] }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.revenue));

  if (days.every((d) => d.revenue === 0)) {
    return <p className="text-sm text-gray-400">{t("analytics.noData")}</p>;
  }

  return (
    <div>
      <div className="relative flex h-40 items-end gap-1">
        {hover != null && (
          <div
            className="pointer-events-none absolute -top-8 rounded-lg bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white"
            style={{ insetInlineStart: `${(hover / days.length) * 100}%` }}
          >
            {days[hover].label} · {days[hover].revenue.toLocaleString()}
          </div>
        )}
        {days.map((d, i) => (
          <div
            key={d.key}
            className="group flex-1"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
          >
            <div
              className={`mx-auto w-full max-w-[18px] rounded-t-sm transition-colors ${
                hover === i ? "bg-brand-700" : "bg-brand-600"
              }`}
              style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-400">
        <span>{days[0].label}</span>
        <span>{days[days.length - 1].label}</span>
      </div>
    </div>
  );
}

export function Analytics() {
  const { t, i18n } = useTranslation();
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [reps, setReps] = useState<Profile[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("visits")
      .select("*")
      .then(({ data }) => setVisits(data ?? []));
    supabase
      .from("shops")
      .select("*")
      .then(({ data }) => setShops(data ?? []));
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "rep")
      .then(({ data }) => setReps(data ?? []));
    supabase
      .from("products")
      .select("*")
      .then(({ data }) => setProducts(data ?? []));
    supabase
      .from("order_items")
      .select("*, products(name, category, active), visits(visit_time)")
      .then(({ data }) => setOrderItems((data as OrderItemRow[]) ?? []));
  }, []);

  const loaded = visits && shops && reps && products && orderItems;

  const stats = useMemo(() => {
    if (!loaded) return null;

    const sold = visits.filter((v) => v.outcome === "sold");
    const todayStart = startOfDay(0);
    const monthStart = startOfMonth();
    const thirtyDaysAgo = startOfDay(29);
    const fourteenDaysAgo = startOfDay(13);

    const todayRevenue = sold
      .filter((v) => new Date(v.visit_time) >= todayStart)
      .reduce((sum, v) => sum + Number(v.sale_amount ?? 0), 0);

    const monthSold = sold.filter((v) => new Date(v.visit_time) >= monthStart);
    const monthRevenue = monthSold.reduce((sum, v) => sum + Number(v.sale_amount ?? 0), 0);
    const aov = monthSold.length ? monthRevenue / monthSold.length : 0;

    const last30Sold = sold.filter((v) => new Date(v.visit_time) >= thirtyDaysAgo);
    const activeShopIds = new Set(last30Sold.map((v) => v.shop_id));

    const targetedReps = reps.filter((r) => r.active && r.daily_target != null);
    const targetTotal = targetedReps.reduce((sum, r) => sum + Number(r.daily_target ?? 0), 0);
    const achievedTotal = targetedReps.reduce((sum, r) => {
      const repToday = sold.filter((v) => v.rep_id === r.id && new Date(v.visit_time) >= todayStart);
      return sum + repToday.reduce((s, v) => s + Number(v.sale_amount ?? 0), 0);
    }, 0);
    const targetAchievement = targetTotal > 0 ? (achievedTotal / targetTotal) * 100 : null;

    // Sales trend: last 14 days, oldest to newest.
    const trendDays: { key: string; label: string; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = startOfDay(i);
      const key = dayKey(d);
      const revenue = sold
        .filter((v) => dayKey(new Date(v.visit_time)) === key)
        .reduce((sum, v) => sum + Number(v.sale_amount ?? 0), 0);
      trendDays.push({
        key,
        label: d.toLocaleDateString(i18n.language, { month: "short", day: "numeric" }),
        revenue,
      });
    }

    // Sales by shop classification, last 30 days.
    const shopById = new Map(shops.map((s) => [s.id, s]));
    const byClassification: Record<ShopClassification | "none", { revenue: number; visits: number }> = {
      A: { revenue: 0, visits: 0 },
      B: { revenue: 0, visits: 0 },
      C: { revenue: 0, visits: 0 },
      none: { revenue: 0, visits: 0 },
    };
    for (const v of last30Sold) {
      const cls = shopById.get(v.shop_id)?.classification ?? "none";
      byClassification[cls].revenue += Number(v.sale_amount ?? 0);
      byClassification[cls].visits += 1;
    }

    // Best/slow movers from order_items in the last 30 days.
    const qtyByProduct = new Map<string, number>();
    for (const item of orderItems) {
      if (!item.product_id) continue;
      const visitTime = item.visits?.visit_time;
      if (!visitTime || new Date(visitTime) < thirtyDaysAgo) continue;
      qtyByProduct.set(item.product_id, (qtyByProduct.get(item.product_id) ?? 0) + Number(item.quantity));
    }
    const activeProducts = products.filter((p) => p.active);
    const withQty = activeProducts.map((p) => ({ product: p, qty: qtyByProduct.get(p.id) ?? 0 }));
    const bestSellers = [...withQty]
      .filter((r) => r.qty > 0)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    const slowMovers = [...withQty].sort((a, b) => a.qty - b.qty).slice(0, 5);

    // Shop insights: last visit per shop, top shops by 30-day revenue.
    const lastVisitByShop = new Map<string, string>();
    for (const v of visits) {
      const existing = lastVisitByShop.get(v.shop_id);
      if (!existing || new Date(v.visit_time) > new Date(existing)) {
        lastVisitByShop.set(v.shop_id, v.visit_time);
      }
    }
    const notVisitedRecently = shops
      .map((s) => {
        const last = lastVisitByShop.get(s.id) ?? null;
        const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000) : null;
        return { shop: s, last, daysSince };
      })
      .filter((r) => r.daysSince === null || new Date(fourteenDaysAgo) > new Date(r.last!))
      .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity))
      .slice(0, 10);

    const revenueByShop = new Map<string, number>();
    for (const v of last30Sold) {
      revenueByShop.set(v.shop_id, (revenueByShop.get(v.shop_id) ?? 0) + Number(v.sale_amount ?? 0));
    }
    const topShops = [...revenueByShop.entries()]
      .map(([shopId, revenue]) => ({ shop: shopById.get(shopId), revenue }))
      .filter((r) => r.shop)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      todayRevenue,
      monthRevenue,
      aov,
      activeShopsCount: activeShopIds.size,
      targetAchievement,
      trendDays,
      byClassification,
      bestSellers,
      slowMovers,
      notVisitedRecently,
      topShops,
    };
  }, [loaded, visits, shops, reps, products, orderItems, i18n.language]);

  if (!stats) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t("analytics.title")}</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label={t("analytics.todayRevenue")} value={stats.todayRevenue.toLocaleString()} />
        <StatCard label={t("analytics.monthRevenue")} value={stats.monthRevenue.toLocaleString()} />
        <StatCard label={t("analytics.aov")} value={stats.aov.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
        <StatCard label={t("analytics.activeShops")} value={String(stats.activeShopsCount)} />
        <StatCard
          label={t("analytics.targetAchievement")}
          value={stats.targetAchievement != null ? `${stats.targetAchievement.toFixed(0)}%` : "—"}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("analytics.salesTrend")}
        </h3>
        <SalesTrendChart days={stats.trendDays} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("analytics.salesByClassification")}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["A", "B", "C", "none"] as const).map((cls) => (
            <div key={cls} className="rounded-lg border border-gray-100 p-3 text-center">
              {cls === "none" ? (
                <span className="text-xs text-gray-400">—</span>
              ) : (
                <ClassificationBadge classification={cls} />
              )}
              <p className="mt-1 text-lg font-bold text-gray-900">
                {stats.byClassification[cls].revenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">{stats.byClassification[cls].visits}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("analytics.bestSellers")}
          </h3>
          {stats.bestSellers.length === 0 ? (
            <p className="text-sm text-gray-400">{t("analytics.noData")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.bestSellers.map(({ product, qty }) => (
                <li key={product.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-gray-900">{product.name}</span>
                  <span className="text-gray-500">{qty.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("analytics.slowMovers")}
          </h3>
          {stats.slowMovers.length === 0 ? (
            <p className="text-sm text-gray-400">{t("analytics.noData")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.slowMovers.map(({ product, qty }) => (
                <li key={product.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-gray-900">{product.name}</span>
                  <span className="text-gray-500">{qty.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("analytics.topShops")}
          </h3>
          {stats.topShops.length === 0 ? (
            <p className="text-sm text-gray-400">{t("analytics.noData")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.topShops.map(({ shop, revenue }) => (
                <li key={shop!.id} className="flex items-center justify-between py-2 text-sm">
                  <Link to={`/dashboard/shops/${shop!.id}`} className="font-medium text-brand-700">
                    {shop!.shop_name}
                  </Link>
                  <span className="text-gray-500">{revenue.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-gray-500">
            <span>{t("analytics.shopInsights")}</span>
            <span className="normal-case text-gray-400">{t("analytics.notVisitedRecently")}</span>
          </h3>
          {stats.notVisitedRecently.length === 0 ? (
            <p className="text-sm text-gray-400">{t("analytics.noData")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.notVisitedRecently.map(({ shop, daysSince }) => (
                <li key={shop.id} className="flex items-center justify-between py-2 text-sm">
                  <Link to={`/dashboard/shops/${shop.id}`} className="font-medium text-brand-700">
                    {shop.shop_name}
                  </Link>
                  <span className="text-gray-500">
                    {daysSince == null ? t("analytics.neverVisited") : t("analytics.daysAgo", { count: daysSince })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
