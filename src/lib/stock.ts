import type { StockSang } from "@/api/models";

/** Rows whose quantity is at or below the alert threshold. */
export function lowStockRows(stock: StockSang[]): StockSang[] {
  return stock.filter((s) => s.quantitePoches <= s.seuilAlerte);
}

export type StockLevel = "critical" | "low" | "ok";

/**
 * Display level of a stock row:
 * - critical: at or below half the alert threshold,
 * - low: at or below the threshold,
 * - ok: above the threshold.
 * The "half the threshold" cut-off is a display choice, not a medical rule.
 */
export function stockLevel(s: StockSang): StockLevel {
  if (s.quantitePoches <= s.seuilAlerte / 2) return "critical";
  if (s.quantitePoches <= s.seuilAlerte) return "low";
  return "ok";
}

export const levelStatusClass: Record<StockLevel, string> = {
  critical: "",
  low: "warn",
  ok: "good",
};

/** Upper bound of the gauges, so every bar of a center shares the same scale. */
export function gaugeMax(stock: StockSang[]): number {
  return Math.max(1, ...stock.map((s) => Math.max(s.quantitePoches, s.seuilAlerte * 2)));
}

/** Requests whose deadline has passed or that the backend marked as expired. */
export function isRequestExpired(r: { statut: string; dateExpiration: string }): boolean {
  return r.statut === "EXPIREE" || new Date(r.dateExpiration).getTime() < Date.now();
}
