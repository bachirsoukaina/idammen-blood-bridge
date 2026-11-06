import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { loyaltyApi } from "@/api/loyaltyApi";
import type { EchangeRecompense, PointsDonneur, Recompense } from "@/api/models";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { RoleGuard } from "@/components/role-guard";
import { AppShell, PageError, PageLoading } from "@/components/app-shell";

export const Route = createFileRoute("/donor/loyalty")({
  head: () => ({ meta: [{ title: "Ma fidélité — Idammen" }] }),
  component: () => (
    <RoleGuard role="DONNEUR">
      <DonorLoyaltyPage />
    </RoleGuard>
  ),
});

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 20,
};

function DonorLoyaltyPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [points, setPoints] = useState<PointsDonneur | null>(null);
  const [rewards, setRewards] = useState<Recompense[]>([]);
  const [exchanges, setExchanges] = useState<EchangeRecompense[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [pts, list] = await Promise.all([loyaltyApi.me(), loyaltyApi.rewards()]);
      setPoints(pts);
      setRewards(list);
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

  async function exchange(reward: Recompense) {
    if (points && points.pointsActuels < reward.coutPoints) {
      toast.error(t("notEnough", "Points insuffisants"));
      return;
    }
    setBusyId(reward.id);
    try {
      const done = await loyaltyApi.exchange(reward.id);
      setExchanges((list) => [done, ...list]);
      setPoints((p) => (p ? { ...p, pointsActuels: p.pointsActuels - reward.coutPoints } : p));
      setRewards((list) =>
        list.map((r) =>
          r.id === reward.id ? { ...r, stockDisponible: r.stockDisponible - 1 } : r,
        ),
      );
      setCode(done.codeUtilisation);
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell space="donor" title={t("loyalty")}>
      {state === "loading" && <PageLoading />}

      {state === "error" && <PageError message={error} onRetry={() => void load()} />}

      {state === "ready" && points && (
        <>
          <p style={{ color: "var(--muted-foreground)", margin: 0 }}>{t("loyaltyIntro")}</p>

          <section style={{ ...card, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div
                  data-testid="points-balance"
                  style={{ fontSize: 34, fontWeight: 900, color: "var(--primary)" }}
                >
                  {points.pointsActuels}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{t("points")}</div>
              </div>
              <div>
                <div style={{ fontSize: 34, fontWeight: 900 }}>{points.nombreDonsTotal}</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  {t("totalDonations")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 34, fontWeight: 900 }}>{points.niveau}</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{t("level")}</div>
              </div>
            </div>
            {points.prochainNiveau && (
              <div>
                <div
                  role="progressbar"
                  aria-valuenow={points.progression ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{
                    height: 10,
                    background: "var(--muted)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${points.progression ?? 0}%`,
                      height: "100%",
                      background: "var(--primary)",
                      borderRadius: 999,
                    }}
                  />
                </div>
                <small style={{ color: "var(--muted-foreground)" }}>
                  {t("nextLevel", {
                    points: points.pointsProchainNiveau ?? 0,
                    level: points.prochainNiveau,
                  })}
                </small>
              </div>
            )}
          </section>

          <section style={card}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>{t("rewards")}</h2>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              {rewards.map((r) => {
                const cannot = (points?.pointsActuels ?? 0) < r.coutPoints;
                const none = r.stockDisponible < 1;
                return (
                  <article
                    key={r.id}
                    style={{
                      border: "1px solid var(--border, #e5e0df)",
                      borderRadius: 10,
                      padding: 16,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <strong style={{ fontSize: 16 }}>
                      {r.translationKey
                        ? t(`${r.translationKey}Desc`, r.description)
                        : r.description}
                    </strong>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
                      {r.translationKey ? t(r.translationKey, r.nom) : r.nom}
                    </span>
                    <span style={{ fontWeight: 800, color: "var(--primary)" }}>
                      {t("pointsCost", { count: r.coutPoints })}
                    </span>
                    <button
                      type="button"
                      disabled={busyId === r.id || cannot || none}
                      onClick={() => void exchange(r)}
                      style={{
                        background: cannot || none ? "var(--muted)" : "#2e7d5b",
                        color: cannot || none ? "var(--muted-foreground)" : "#fff",
                        border: 0,
                        borderRadius: 6,
                        padding: "10px 14px",
                        fontWeight: 700,
                        cursor: cannot || none ? "not-allowed" : "pointer",
                      }}
                    >
                      {none ? t("outOfStock") : t("exchange")}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          {exchanges.length > 0 && (
            <section style={card}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>{t("rewardCode")}</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <tbody>
                  {exchanges.map((x) => (
                    <tr key={x.id} style={{ borderBottom: "1px solid var(--border, #eee)" }}>
                      <td style={{ padding: 8, fontWeight: 800, fontFamily: "monospace" }}>
                        {x.codeUtilisation}
                      </td>
                      <td style={{ padding: 8 }}>{formatDateTime(x.dateEchange)}</td>
                      <td style={{ padding: 8 }}>{t(x.statut, x.statut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <small style={{ color: "var(--muted-foreground)" }}>{t("codeHint")}</small>
            </section>
          )}
        </>
      )}
      {code && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("rewardCode")}
          onClick={() => setCode("")}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,10,10,.55)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 380,
              width: "100%",
              display: "grid",
              gap: 12,
              textAlign: "center",
            }}
          >
            <strong style={{ fontSize: 18 }}>{t("rewardCode")}</strong>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                fontFamily: "monospace",
                letterSpacing: 2,
                color: "var(--primary)",
              }}
            >
              {code}
            </div>
            <small style={{ color: "var(--muted-foreground)" }}>{t("codeHint")}</small>
            <button
              type="button"
              onClick={() => setCode("")}
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                border: 0,
                borderRadius: 6,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
