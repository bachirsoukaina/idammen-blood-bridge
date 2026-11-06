import { z } from "zod";
import { http, useMock, mockResult } from "./client";
import { mockDb, requireMockRole, validateMockDonation } from "./mock";
import { requestSchema } from "./validation";
import type { DemandeDon, DonorResponse, Don } from "./models";
export const requestApi = {
  list: () =>
    useMock
      ? mockResult(() => {
          requireMockRole("CENTRE");
          return mockDb.requests.filter((r) => r.centreId === mockDb.center.id);
        })
      : http<DemandeDon[]>("/api/requests"),
  create: (input: unknown) => {
    const data = requestSchema.parse(input);
    return useMock
      ? mockResult(() => {
          requireMockRole("CENTRE");
          const request = {
            ...data,
            id: Date.now(),
            centreId: mockDb.center.id,
            statut: "ACTIVE",
            dateCreation: new Date().toISOString(),
            centre: mockDb.center,
          };
          mockDb.requests.unshift(request);
          return request;
        })
      : http<DemandeDon>("/api/requests", "POST", data);
  },
  respond: (id: number, reponse: string) => {
    z.enum(["CONFIRME", "DECLINE"]).parse(reponse);
    return useMock
      ? mockResult(() => {
          requireMockRole("DONNEUR");
          const request = mockDb.requests.find((r) => r.id === id);
          if (
            !request ||
            request.statut === "EXPIREE" ||
            new Date(request.dateExpiration) < new Date()
          )
            throw new Error("error");
          request.reponse = reponse;
          let row = mockDb.responses.find((r) => r.don.demandeId === id && r.donneur.id === 1);
          if (!row) {
            row = {
              donneur: mockDb.donor,
              reponse,
              don: {
                id: Date.now(),
                donneurId: 1,
                centreId: request.centreId,
                demandeId: id,
                quantite: 1,
                datePrelevement: new Date().toISOString(),
                statut: "PLANIFIE",
              },
            };
            mockDb.responses.push(row);
          }
          row.reponse = reponse;
          return request;
        })
      : http<DemandeDon>(`/api/requests/${id}/respond`, "POST", { reponse });
  },
  responses: (id: number) =>
    useMock
      ? mockResult(() => {
          requireMockRole("CENTRE");
          return mockDb.responses.filter((r) => r.don.demandeId === id);
        })
      : http<DonorResponse[]>(`/api/requests/${id}/responses`),
  validate: (id: number) =>
    useMock
      ? mockResult(() => validateMockDonation(id))
      : http<Don>(`/api/donations/${id}/validate`, "POST"),
};
