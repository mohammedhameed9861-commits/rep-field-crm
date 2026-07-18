// Pure logic extracted from Overview.tsx for unit testing.
import type { Profile, Visit } from "@/types/database";

export interface PeriodSummary {
  visits: number;
  sales: number;
  revenue: number;
  conversion: number;
}

export function summarizeVisits(visits: Visit[], since: Date): PeriodSummary {
  const inRange = visits.filter((v) => new Date(v.visit_time) >= since);
  const sales = inRange.filter((v) => v.outcome === "sold");
  const revenue = sales.reduce((sum, v) => sum + Number(v.sale_amount ?? 0), 0);
  return {
    visits: inRange.length,
    sales: sales.length,
    revenue,
    conversion: inRange.length ? (sales.length / inRange.length) * 100 : 0,
  };
}

export type RepAlert = { rep: Profile; kind: "notStarted" | "behindTarget"; achieved?: number };

export function computeRepAlerts(reps: Profile[], visits: Visit[], todayStart: Date): RepAlert[] {
  const result: RepAlert[] = [];
  for (const rep of reps) {
    const repToday = visits.filter((v) => v.rep_id === rep.id && new Date(v.visit_time) >= todayStart);
    if (repToday.length === 0) {
      result.push({ rep, kind: "notStarted" });
      continue;
    }
    if (rep.daily_target != null) {
      const achieved = repToday
        .filter((v) => v.outcome === "sold")
        .reduce((sum, v) => sum + Number(v.sale_amount ?? 0), 0);
      if (achieved < rep.daily_target) {
        result.push({ rep, kind: "behindTarget", achieved });
      }
    }
  }
  return result;
}
