import { http, useMock, mockResult } from "./client";
import { mockDb, exchangeMockReward } from "./mock";
import type { PointsDonneur, Recompense, EchangeRecompense } from "./models";
export const loyaltyApi = {
  me: () => (useMock ? mockResult(() => mockDb.points) : http<PointsDonneur>("/api/loyalty/me")),
  rewards: () =>
    useMock ? mockResult(() => mockDb.rewards) : http<Recompense[]>("/api/loyalty/rewards"),
  exchange: (id: number) =>
    useMock
      ? mockResult(() => exchangeMockReward(id))
      : http<EchangeRecompense>(`/api/loyalty/rewards/${id}/exchange`, "POST"),
};
