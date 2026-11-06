import { useCallback, useEffect, useState } from "react";

import { centerApi } from "@/api/centerApi";
import type { ReserveCentre } from "@/api/models";

/** Public reserves of every center (no login needed). */
export function useReserves() {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [reserves, setReserves] = useState<ReserveCentre[]>([]);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setReserves(await centerApi.reserves());
      setLoadedAt(new Date());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reserves, loadedAt, reload: load };
}
