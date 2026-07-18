import { describe, expect, it } from "vitest";
import { computeRepAlerts, summarizeVisits } from "./repStats";
import type { Profile, Visit } from "@/types/database";

function makeVisit(overrides: Partial<Visit> = {}): Visit {
  return {
    id: "visit-1",
    rep_id: "rep-1",
    shop_id: "shop-1",
    visit_time: "2026-07-18T10:00:00Z",
    photo_inside_url: "a.jpg",
    photo_outside_url: "b.jpg",
    gps_lat: 33.3,
    gps_lng: 44.4,
    outcome: "sold",
    sale_amount: 1000,
    no_sale_reason: null,
    no_sale_note: null,
    order_notes: null,
    created_at: "2026-07-18T10:00:00Z",
    ...overrides,
  };
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "rep-1",
    full_name: "Rep One",
    phone: null,
    role: "rep",
    active: true,
    daily_target: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("summarizeVisits", () => {
  it("counts only visits at or after the cutoff", () => {
    const since = new Date("2026-07-18T00:00:00Z");
    const visits = [
      makeVisit({ id: "in-range", visit_time: "2026-07-18T09:00:00Z" }),
      makeVisit({ id: "out-of-range", visit_time: "2026-07-17T23:59:59Z" }),
    ];
    expect(summarizeVisits(visits, since).visits).toBe(1);
  });

  it("computes revenue only from sold visits and conversion as sales/visits", () => {
    const since = new Date("2026-07-01T00:00:00Z");
    const visits = [
      makeVisit({ id: "1", outcome: "sold", sale_amount: 1000 }),
      makeVisit({ id: "2", outcome: "sold", sale_amount: 500 }),
      makeVisit({ id: "3", outcome: "no_sale", sale_amount: null }),
    ];
    const result = summarizeVisits(visits, since);
    expect(result.visits).toBe(3);
    expect(result.sales).toBe(2);
    expect(result.revenue).toBe(1500);
    expect(result.conversion).toBeCloseTo((2 / 3) * 100);
  });

  it("returns zeroed stats (not NaN) when there are no visits in range", () => {
    const result = summarizeVisits([], new Date());
    expect(result).toEqual({ visits: 0, sales: 0, revenue: 0, conversion: 0 });
  });
});

describe("computeRepAlerts", () => {
  const todayStart = new Date("2026-07-18T00:00:00Z");

  it("flags a rep with zero visits today as notStarted", () => {
    const reps = [makeProfile({ id: "rep-1" })];
    const alerts = computeRepAlerts(reps, [], todayStart);
    expect(alerts).toEqual([{ rep: reps[0], kind: "notStarted" }]);
  });

  it("does not flag a rep with no daily_target even if they have visits", () => {
    const reps = [makeProfile({ id: "rep-1", daily_target: null })];
    const visits = [makeVisit({ rep_id: "rep-1", visit_time: "2026-07-18T09:00:00Z", outcome: "sold", sale_amount: 1 })];
    expect(computeRepAlerts(reps, visits, todayStart)).toEqual([]);
  });

  it("flags a rep as behindTarget when today's revenue is under their target", () => {
    const reps = [makeProfile({ id: "rep-1", daily_target: 10_000 })];
    const visits = [
      makeVisit({ rep_id: "rep-1", visit_time: "2026-07-18T09:00:00Z", outcome: "sold", sale_amount: 2_000 }),
    ];
    const alerts = computeRepAlerts(reps, visits, todayStart);
    expect(alerts).toEqual([{ rep: reps[0], kind: "behindTarget", achieved: 2_000 }]);
  });

  it("does not flag a rep who has already hit their target today", () => {
    const reps = [makeProfile({ id: "rep-1", daily_target: 1_000 })];
    const visits = [
      makeVisit({ rep_id: "rep-1", visit_time: "2026-07-18T09:00:00Z", outcome: "sold", sale_amount: 1_500 }),
    ];
    expect(computeRepAlerts(reps, visits, todayStart)).toEqual([]);
  });

  it("ignores visits before today when deciding notStarted", () => {
    const reps = [makeProfile({ id: "rep-1" })];
    const visits = [makeVisit({ rep_id: "rep-1", visit_time: "2026-07-17T09:00:00Z" })];
    expect(computeRepAlerts(reps, visits, todayStart)).toEqual([{ rep: reps[0], kind: "notStarted" }]);
  });
});
