import { http, useMock, mockResult } from "./client";
import { mockAlerts, mockDb, nextEligibleDate, requireMockRole } from "./mock";
import { profileSchema } from "./validation";
import type { Donneur, Don, DemandeDon, Eligibility } from "./models";
export const donorApi = {
  me: () =>
    useMock
      ? mockResult(() => {
          requireMockRole("DONNEUR");
          return mockDb.donor;
        })
      : http<Donneur>("/api/donors/me"),
  update: async (input: unknown) => {
    const data = profileSchema.parse(input);
    return useMock
      ? mockResult(() => {
          requireMockRole("DONNEUR");
          return Object.assign(mockDb.donor, data);
        })
      : http<Donneur>("/api/donors/me", "PUT", data);
  },
  eligibility: () =>
    useMock
      ? mockResult(() => {
          const date = nextEligibleDate(mockDb.donor);
          return {
            eligible: date.getTime() <= Date.now(),
            dateEligibilite: date.toISOString().slice(0, 10),
          };
        })
      : http<Eligibility>("/api/donors/me/eligibility"),
  donations: () =>
    useMock
      ? mockResult(() => mockDb.donations.filter((d) => d.donneurId === 1))
      : http<Don[]>("/api/donors/me/donations"),
  alerts: () =>
    useMock ? mockResult(() => mockAlerts()) : http<DemandeDon[]>("/api/donors/me/alerts"),
};
