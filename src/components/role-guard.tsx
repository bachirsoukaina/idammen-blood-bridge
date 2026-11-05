import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Role } from "@/api/models";
import { clearSession, decodeToken, isTokenExpired, readToken, roleHome } from "@/api/session";

export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => {
      const token = readToken();
      if (!token) {
        setAllowed(false);
        void navigate({ to: "/login" as "/", replace: true });
        return;
      }
      if (isTokenExpired(token)) {
        setAllowed(false);
        clearSession(); // déclenche à nouveau check(), qui redirigera vers /login
        return;
      }
      const claims = decodeToken(token);
      if (claims?.role !== role) {
        setAllowed(false);
        void navigate({ to: roleHome(claims?.role ?? "ADMIN") as "/", replace: true });
        return;
      }
      setAllowed(true);
    };
    check();
    window.addEventListener("bloodlink-session", check);
    const timer = window.setInterval(check, 30000);
    return () => {
      window.removeEventListener("bloodlink-session", check);
      window.clearInterval(timer);
    };
  }, [role, navigate]);

  return allowed ? <>{children}</> : null;
}
