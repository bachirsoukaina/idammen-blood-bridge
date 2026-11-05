import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { centerApi, type CenterStats } from "@/api/centerApi";
import { errorMessage } from "@/lib/errors";
import { RoleGuard } from "@/components/role-guard";
import { AppShell, PageError, PageLoading } from "@/components/app-shell";

export const Route = createFileRoute("/center/stats")({
  head: () => ({ meta: [{ title: "Statistiques — Idammen" }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterStatsPage />
    </RoleGuard>
  ),
});

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 20,
};

function CenterStatsPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<CenterStats | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setStats(await centerApi.stats());
      setState("ready");
    } catch (e) {
      setError(errorMessage(e, t));
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const monthly = (stats?.monthly ?? []).map((m) => ({
    ...m,
    label: t(`month${m.month}`, String(m.month)),
  }));
  const stock = (stats?.stock ?? []).map((s) => ({
    group: s.groupeSanguin,
    poches: s.quantitePoches,
    seuil: s.seuilAlerte,
  }));

  return (
    <AppShell space="center" title={t("stats")}>
      {state === "loading" && <PageLoading />}

      {state === "error" && <PageError message={error} onRetry={() => void load()} />}

      {state === "ready" && stats && (
        <>
          <p style={{ color: "var(--muted-foreground)", margin: 0 }}>{t("statsIntro")}</p>

          <section style={card}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
              {t("monthlyDonations")}
            </h2>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={monthly} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="dons"
                    name={t("monthlyDonations")}
                    fill="#b5332a"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section style={card}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>{t("stockByGroup")}</h2>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={stock} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="group" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="poches"
                    name={t("bags", { count: 0 }).replace(/^0\s*/, "")}
                    fill="#1f3a5f"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar dataKey="seuil" name={t("threshold")} fill="#d9a441" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
