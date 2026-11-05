import { clearSession, isTokenExpired, readToken } from "./session";
export const useMock = import.meta.env["VITE_USE_MOCK"] !== "false";
const baseUrl = import.meta.env["VITE_API_URL"] || "http://localhost:8080";
export async function http<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = readToken();
  if (token && isTokenExpired(token)) {
    clearSession();
    throw new Error("sessionExpired");
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 401) {
    clearSession();
    throw new Error("sessionExpired");
  }
  if (!response.ok) throw new Error("error");
  if (response.status === 204) return undefined as T;
  return response.json();
}
export async function mockResult<T>(fn: () => T): Promise<T> {
  await new Promise((r) => setTimeout(r, 220));
  return structuredClone(fn());
}
