import { http, useMock, mockResult } from "./client";
import {
  mockDb,
  mockMonthlyDonations,
  mockNearbyDonors,
  mockReserves,
  requireMockRole,
} from "./mock";
import { stockSchema } from "./validation";
import type { Centre, StockSang, Donneur, ReserveCentre } from "./models";
export interface CenterStats {
  monthly: { month: number; dons: number }[];
  stock: StockSang[];
}
export const centerApi = {
  me: () =>
    useMock
      ? mockResult(() => {
          requireMockRole("CENTRE");
          return mockDb.center;
        })
      : http<Centre>("/api/centers/me"),
  update: (input: Centre) =>
    useMock
      ? mockResult(() => {
          requireMockRole("CENTRE");
          return Object.assign(mockDb.center, input);
        })
      : http<Centre>("/api/centers/me", "PUT", input),
  stock: () =>
    useMock ? mockResult(() => mockDb.stock) : http<StockSang[]>("/api/centers/me/stock"),
  updateStock: (id: number, input: unknown) => {
    const data = stockSchema.parse(input);
    return useMock
      ? mockResult(() => {
          requireMockRole("CENTRE");
          const stock = mockDb.stock.find((s) => s.id === id);
          if (!stock) throw new Error("error");
          return Object.assign(stock, data);
        })
      : http<StockSang>(`/api/centers/me/stock/${id}`, "PUT", data);
  },
  nearby: () =>
    useMock
      ? mockResult(() => mockNearbyDonors())
      : http<Donneur[]>("/api/centers/me/nearby-donors"),
  stats: () =>
    useMock
      ? mockResult(() => ({
          monthly: mockMonthlyDonations(),
          stock: mockDb.stock,
        }))
      : http<CenterStats>("/api/centers/me/stats"),
  /** Public, sans connexion : réserves par centre et par groupe, sans donnée personnelle. */
  reserves: () =>
    useMock ? mockResult(() => mockReserves()) : http<ReserveCentre[]>("/api/public/reserves"),
};
