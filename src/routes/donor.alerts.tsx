import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { donorApi } from "@/api/donorApi";
import { requestApi } from "@/api/requestApi";
import type { DemandeDon, Donneur } from "@/api/models";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, ltr } from "@/lib/format";
import { RoleGuard } from "@/components/role-guard";
import { AppShell, EmptyState, PageError, PageLoading } from "@/components/app-shell";
import { Clock, Droplets, HeartHandshake, MapPin } from "lucide-react";
import { distanceKm } from "@/lib/geo";
import { urgenceStatusClass } from "@/lib/stock";

export const Route = createFileRoute("/donor/alerts")({
  head: () => ({ meta: [{ title: "Mes alertes — Idammen" }] }),
  component: () => (
    <RoleGuard role="DONNEUR">
      <DonorAlertsPage />
    </RoleGuard>
  ),
});

function isExpired(r: DemandeDon) {
  return r.statut === "EXPIREE" || new Date(r.dateExpiration).getTime() < Date.now();
}

function DonorAlertsPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState<DemandeDon[]>([]);
  const [donor, setDonor] = useState<Donneur | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [list, me] = await Promise.all([donorApi.alerts(), donorApi.me()]);
      setAlerts(list);
      setDonor(me);
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

  async function answer(id: number, reponse: "CONFIRME" | "DECLINE") {
    setBusyId(id);
    try {
      const updated = await requestApi.respond(id, reponse);
      setAlerts((list) =>
        list.map((a) => (a.id === id ? { ...a, reponse: updated.reponse ?? reponse } : a)),
      );
      toast.success(
        reponse === "CONFIRME"
          ? t("confirmedToast", "Merci ! Votre disponibilité est confirmée.")
          : t("declinedToast", "Réponse enregistrée."),
      );
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell space="donor" title={t("alerts")} intro={t("alertsIntro")}>
      {state === "loading" && <PageLoading />}

      {state === "error" && <PageError message={error} onRetry={() => void load()} />}

      {state === "ready" && alerts.length === 0 && <EmptyState>{t("noAlerts")}</EmptyState>}

      {state === "ready" &&
        alerts.map((a) => {
          const expired = isExpired(a);
          const answered = Boolean(a.reponse);
          const hoursLeft = Math.max(
            0,
            Math.round((new Date(a.dateExpiration).getTime() - Date.now()) / 3600e3),
          );
          const km = donor && a.centre ? distanceKm(donor, a.centre) : null;
          return (
            <article
              key={a.id}
              className={`alert-card urgency-${a.urgence.toLowerCase()}`}
              style={{ opacity: expired ? 0.6 : 1 }}
            >
              <div className="alert-card-head">
                <span className="blood-badge" style={{ fontSize: 18, padding: "8px 12px" }}>
                  {a.groupeSanguinDemande}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong className="alert-card-title">{a.centre?.nom ?? `#${a.centreId}`}</strong>
                  <small>
                    <MapPin size={12} aria-hidden /> {a.centre?.adresse}
                    {km !== null && (
                      <> · {t("kmAway", { km: km < 10 ? km.toFixed(1) : Math.round(km) })}</>
                    )}
                  </small>
                </div>
                <span className={`status ${urgenceStatusClass[a.urgence] ?? ""}`}>
                  {t(a.urgence)}
                </span>
              </div>

              <ul className="alert-facts">
                <li>
                  <Droplets size={15} aria-hidden />{" "}
                  {t("bagsNeeded", { count: a.quantiteNecessaire })}
                </li>
                <li>
                  <Clock size={15} aria-hidden />{" "}
                  {expired
                    ? t("expired")
                    : t("hoursLeft", { count: hoursLeft, date: formatDateTime(a.dateExpiration) })}
                </li>
                {donor && (
                  <li>
                    <HeartHandshake size={15} aria-hidden />{" "}
                    {t("compatibleBecause", {
                      mine: ltr(donor.groupeSanguin),
                      needed: ltr(a.groupeSanguinDemande),
                    })}
                  </li>
                )}
              </ul>

              {expired ? null : answered ? (
                <p
                  className={`status ${a.reponse === "CONFIRME" ? "good" : "muted"}`}
                  style={{ justifySelf: "start", margin: 0 }}
                >
                  {a.reponse === "CONFIRME" ? t("youConfirmed") : t("youDeclined")}
                </p>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={busyId === a.id}
                    onClick={() => void answer(a.id, "CONFIRME")}
                  >
                    {t("available")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={busyId === a.id}
                    onClick={() => void answer(a.id, "DECLINE")}
                  >
                    {t("decline")}
                  </button>
                </div>
              )}
            </article>
          );
        })}
    </AppShell>
  );
}
