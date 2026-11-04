import type { StockSang } from '@/api/models';

/** Rows whose quantity is at or below the alert threshold. */
export function lowStockRows(stock: StockSang[]): StockSang[] {
  return stock.filter((s) => s.quantitePoches <= s.seuilAlerte);
}
