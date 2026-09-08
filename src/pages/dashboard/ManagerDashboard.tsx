import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, TrendingUp, Users } from "lucide-react";
import {
  fetchLowStockProducts,
  fetchOverallStats,
  fetchRecentActivity,
  fetchStaffActivityCounts,
  type OverallStats,
  type StaffActivityCount,
} from "../../lib/dashboard";
import { formatIQD, timeAgo } from "../../lib/format";
import type { ActivityItem, Product } from "../../lib/types";

export default function ManagerDashboard() {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [staffCounts, setStaffCounts] = useState<StaffActivityCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchOverallStats(),
      fetchRecentActivity(20),
      fetchLowStockProducts(),
      fetchStaffActivityCounts(7),
    ])
      .then(([s, a, ls, sc]) => {
        if (!alive) return;
        setStats(s);
        setActivity(a);
        setLowStock(ls);
        setStaffCounts(sc);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-7 pb-4 pt-6">
        <h1 className="text-xl font-bold text-sea-800">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">Everything across the team, at a glance.</p>
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        <div className="grid grid-cols-3 gap-4">
          <StatTile
            icon={Users}
            label="Active Accounts"
            value={loading ? "…" : String(stats?.totalAccounts ?? 0)}
          />
          <StatTile
            icon={TrendingUp}
            label="Total Orders"
            value={loading ? "…" : String(stats?.totalOrders ?? 0)}
          />
          <StatTile
            icon={Boxes}
            label="Total Bouquets"
            value={loading ? "…" : String(stats?.totalBouquets ?? 0)}
          />
        </div>

        <div className="mt-5 grid grid-cols-[1fr_320px] gap-4">
          {/* Recent activity */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-sea-800">Recent Activity</h2>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing logged yet.</p>
            ) : (
              <div className="flex flex-col">
                {activity.map((item) => (
                  <div
                    key={`${item.kind}-${item.data.id}`}
                    className="flex items-start gap-3 border-t border-gray-100 py-2.5 first:border-t-0"
                  >
                    <div
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        item.kind === "call" ? "bg-plum-500" : "bg-teal-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      {item.kind === "visit" && (
                        <p className="text-gray-900">
                          <span className="font-semibold">{item.data.rep?.full_name ?? "A rep"}</span>{" "}
                          visited{" "}
                          <Link to={`/accounts/${item.data.account_id}`} className="font-semibold text-teal-700 hover:underline">
                            {item.data.account?.name ?? "a shop"}
                          </Link>{" "}
                          &middot; {item.data.outcome === "sold" ? "sold" : "no sale"}
                        </p>
                      )}
                      {item.kind === "call" && (
                        <p className="text-gray-900">
                          <span className="font-semibold">
                            {item.data.telesales?.full_name ?? "Telesales"}
                          </span>{" "}
                          called{" "}
                          <Link to={`/accounts/${item.data.account_id}`} className="font-semibold text-teal-700 hover:underline">
                            {item.data.account?.name ?? "a shop"}
                          </Link>{" "}
                          &middot; {item.data.outcome.replace("_", " ")}
                        </p>
                      )}
                      {item.kind === "order" && (
                        <p className="text-gray-900">
                          <span className="font-semibold">
                            {item.data.created_by_profile?.full_name ?? "Someone"}
                          </span>{" "}
                          logged an order at{" "}
                          <Link to={`/accounts/${item.data.account_id}`} className="font-semibold text-teal-700 hover:underline">
                            {item.data.account?.name ?? "a shop"}
                          </Link>{" "}
                          &middot; {formatIQD(item.data.amount)}
                        </p>
                      )}
                      <p className="mt-0.5 text-gray-400">{timeAgo(item.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {/* Low stock */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-sea-800">
                <AlertTriangle size={15} className="text-warn-600" /> Low Stock
              </h2>
              {loading ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : lowStock.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing low on stock.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {lowStock.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-900">{p.name}</span>
                      <span className="rounded-full bg-warn-100 px-2 py-0.5 font-bold text-warn-600">
                        {p.stock_qty} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff activity, last 7 days */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-sea-800">Staff Activity &middot; 7 days</h2>
              {loading ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : staffCounts.length === 0 ? (
                <p className="text-sm text-gray-400">No staff yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {staffCounts.map((sc) => (
                    <div key={sc.profile.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-900">{sc.profile.full_name}</span>
                      <span className="font-semibold text-gray-500">{sc.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon size={15} />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-sea-800">{value}</div>
    </div>
  );
}
