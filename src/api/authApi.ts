import { http, useMock, mockResult } from "./client";
import { loginSchema, registerSchema } from "./validation";
import { mockDb } from "./mock";
import type { Role } from "./models";
export function mockToken(role: Role, sub = "1") {
  return `${btoa(JSON.stringify({ alg: "none", typ: "JWT" }))}.${btoa(JSON.stringify({ sub, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.demo`;
}
export const authApi = {
  login: async (input: unknown) => {
    const data = loginSchema.parse(input);
    return useMock
      ? mockResult(() => ({
          token: mockToken(
            // Mock only: staff addresses open the center portal; the real role comes from the backend.
            data.email === "centre@example.ma" || data.email.endsWith("@sante.gov.ma")
              ? "CENTRE"
              : "DONNEUR",
          ),
        }))
      : http<{ token: string }>("/auth/login", "POST", data);
  },
  register: async (input: unknown) => {
    const data = registerSchema.parse(input);
    return useMock
      ? mockResult(() => {
          const { password, ...profile } = data;
          Object.assign(mockDb.donor, profile);
          return { token: mockToken("DONNEUR") };
        })
      : http<{ token: string }>("/auth/register", "POST", data);
  },
  demo: (role: Role) => mockResult(() => ({ token: mockToken(role) })),
};
