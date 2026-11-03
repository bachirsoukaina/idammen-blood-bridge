import { useEffect, useState } from 'react';
import { decodeToken, readToken } from '@/api/session';
import type { Role } from '@/api/models';

export interface Session {
  token: string;
  sub: string;
  role: Role;
}

function readSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const token = readToken();
  if (!token) return null;
  const claims = decodeToken(token);
  return claims ? { token, sub: claims.sub, role: claims.role } : null;
}

/**
 * Reactive session state. Always starts null on the server and on the first
 * client render, then fills in from localStorage — this keeps SSR/hydration
 * markup identical.
 */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const update = () => setSession(readSession());
    update();
    window.addEventListener('bloodlink-session', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('bloodlink-session', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return session;
}
