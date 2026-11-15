import { describe, expect, it } from "vitest";

import { formatDate, formatKw, formatMoney, formatPercent } from "./format";

// Intl puts a no-break space between number and unit.
const nbsp = " ";

describe("formatMoney", () => {
  it("drops cents on whole euros", () => {
    expect(formatMoney(7800)).toBe(`7.800${nbsp}€`);
  });

  it("shows cents otherwise", () => {
    expect(formatMoney(123.5)).toBe(`123,50${nbsp}€`);
  });
});

describe("formatPercent", () => {
  it("formats a fraction as a German percentage", () => {
    expect(formatPercent(0.069)).toBe(`6,9${nbsp}%`);
  });

  it("keeps two decimals", () => {
    expect(formatPercent(0.0695)).toBe(`6,95${nbsp}%`);
  });
});

describe("formatKw", () => {
  it("formats system size in kW", () => {
    expect(formatKw(6.5)).toBe(`6,5${nbsp}kW`);
  });
});

describe("formatDate", () => {
  it("formats a date as DD.MM.YYYY", () => {
    expect(formatDate(new Date("2026-11-15T12:00:00Z"))).toBe("15.11.2026");
  });
});
