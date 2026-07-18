import { describe, expect, it } from "vitest";
import { haversineMeters } from "./geo";

describe("haversineMeters", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineMeters(33.3128, 44.3615, 33.3128, 44.3615)).toBe(0);
  });

  it("returns a small distance for two nearby points (within a city block)", () => {
    // Roughly 111m apart (0.001 degrees of latitude).
    const distance = haversineMeters(33.3128, 44.3615, 33.3138, 44.3615);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);
  });

  it("returns a large distance for two points in different cities", () => {
    // Baghdad vs. Erbil, roughly 300km apart.
    const distance = haversineMeters(33.3128, 44.3615, 36.19, 44.01);
    expect(distance).toBeGreaterThan(300_000);
  });

  it("is symmetric regardless of argument order", () => {
    const a = haversineMeters(33.3128, 44.3615, 33.32, 44.37);
    const b = haversineMeters(33.32, 44.37, 33.3128, 44.3615);
    expect(a).toBeCloseTo(b);
  });
});
