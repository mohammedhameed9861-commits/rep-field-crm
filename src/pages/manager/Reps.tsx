import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import type { Profile, Visit } from "@/types/database";

type SortKey = "visits" | "sales" | "revenue" | "conversion";

interface RepStats {
  profile: Profile;
  visits: number;
  sales: number;
  revenue: number;
  conversion: number;
  noSaleReasons: Record<string, number>;
}

export function Reps() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("revenue");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "rep")
      .then(({ data }) => setProfiles(data ?? []));
    supabase
      .from("visits")
      .select("*")
      .then(({ data }) => setVisits(data ?? []));
  }, []);

  const rows: RepStats[] = useMemo(() => {
    if (!profiles || !visits) return [];
    return profiles
      .map((profile) => {
        const repVisits = visits.filter((v) => v.rep_id === profile.id);
        const sales = repVisits.filter((v) => v.outcome === "sold");
        const revenue = sales.reduce((sum, v) => sum + Number(v.sale_amount ?? 0), 0);
        const noSaleReasons: Record<string, number> = {};
        for (const v of repVisits) {
          if (v.outcome === "no_sale" && v.no_sale_reason) {
            noSaleReasons[v.no_sale_reason] = (noSaleReasons[v.no_sale_reason] ?? 0) + 1;
          }
        }
        return {
          profile,
          visits: repVisits.length,
          sales: sales.length,
          revenue,
          conversion: repVisits.length ? (sales.length / repVisits.length) * 100 : 0,
          noSaleReasons,
        };
      })
      .sort((a, b) => b[sortKey] - a[sortKey]);
  }, [profiles, visits, sortKey]);

  if (!profiles || !visits) return <FullScreenLoader />;

  const columns: { key: SortKey; label: string }[] = [
    { key: "visits", label: "Visits" },
    { key: "sales", label: "Sales" },
    { key: "revenue", label: "Revenue" },
    { key: "conversion", label: "Conv. %" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Reps</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3">Rep</th>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3">
                  <button
                    className="flex items-center gap-1 font-semibold"
                    onClick={() => setSortKey(col.key)}
                  >
                    {col.label} <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3">No-sale reasons</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.profile.id}>
                <td className="px-4 py-3">
                  <Link to={`/dashboard/reps/${row.profile.id}`} className="font-medium text-brand-700">
                    {row.profile.full_name}
                  </Link>
                  {!row.profile.active && (
                    <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                      inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{row.visits}</td>
                <td className="px-4 py-3">{row.sales}</td>
                <td className="px-4 py-3">{row.revenue.toLocaleString()}</td>
                <td className="px-4 py-3">{row.conversion.toFixed(0)}%</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {Object.entries(row.noSaleReasons)
                    .map(([reason, count]) => `${reason}: ${count}`)
                    .join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
