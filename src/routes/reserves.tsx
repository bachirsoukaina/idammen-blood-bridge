import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CalendarClock,
  HandHeart,
  MapPin,
  Phone,
  Scale,
  UserCheck,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MapView } from "@/components/map/map-view";
import { PageError, PageLoading } from "@/components/app-shell";
import { ReserveDrop } from "@/components/reserves/reserve-drop";
import { useReserves } from "@/hooks/use-reserves";
import { formatDateTime, ltr } from "@/lib/format";
import { nationalReserves, worstLevel } from "@/lib/reserves";
import { stockLevel } from "@/lib/stock";

export const Route = createFileRoute("/reserves")({
  head: () => ({ meta: [{ title: "État des réserves de sang au Maroc — Idammen" }] }),
  component: ReservesPage,
});

const dotColor = { critical: "var(--primary)", low: "var(--ochre)", ok: "var(--success)" };

function ReservesPage() {
  const { t } = useTranslation();
  const { state, reserves, loadedAt, reload } = useReserves();
  const national = nationalReserves(reserves);
  const tension = national.filter((r) => stockLevel(r) !== "ok");

  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-band">
          <div className="container-id">
            <span className="eyebrow">
              <CalendarClock size={14} aria-hidden />
              {loadedAt
                ? t("updatedAt", { date: formatDateTime(loadedAt.toISOString()) })
                : t("loading")}
            </span>
            <h1 className="section-title" style={{ fontSize: 36 }}>
              {t("reservesTitle")}
            </h1>
            <p className="section-description" style={{ maxWidth: 680 }}>
              {t("reservesIntro")}
            </p>
          </div>
        </section>

        <div className="container-id" style={{ paddingBlock: 36, display: "grid", gap: 24 }}>
          {state === "loading" && <PageLoading />}
          {state === "error" && <PageError message={t("error")} onRetry={() => void reload()} />}

          {state === "ready" && (
            <>
              <section className="surface">
                <div className="surface-head">
                  <h2 className="surface-title">{t("nationalReserves")}</h2>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {t("centersCount", { count: reserves.length })}
                  </span>
                </div>
                <div className="drop-grid">
                  {national.map((r) => (
                    <ReserveDrop key={r.groupeSanguin} reserve={r} />
                  ))}
                </div>
              </section>

              {tension.length > 0 && (
                <section className="cta-band" role="status">
                  <AlertTriangle size={26} aria-hidden />
                  <div>
                    <strong>
                      {t("tensionTitle", {
                        groups: ltr(tension.map((r) => r.groupeSanguin).join(", ")),
                      })}
                    </strong>
                    <p>{t("tensionText")}</p>
                  </div>
                  <Link to="/register" className="btn btn-primary">
                    <HandHeart size={16} aria-hidden /> {t("becomeDonor")}
                  </Link>
                </section>
              )}

              <div
                className="dash-grid"
                style={{ gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)" }}
              >
                <section className="surface">
                  <div className="surface-head">
                    <h2 className="surface-title">{t("centersMap")}</h2>
                  </div>
                  <MapView
                    large
                    center={[32.6, -6.6]}
                    zoom={5}
                    markers={reserves.map((r) => ({
                      latitude: r.centre.latitude,
                      longitude: r.centre.longitude,
                      label: r.centre.nom,
                      detail: r.centre.adresse,
                      kind: worstLevel(r.stock),
                    }))}
                  />
                </section>

                <section className="surface">
                  <div className="surface-head">
                    <h2 className="surface-title">{t("reservesByCity")}</h2>
                  </div>
                  <div className="row-list">
                    {reserves.map((r) => (
                      <article key={r.centre.id} className="center-card">
                        <div>
                          <strong>{t(r.centre.ville ?? "", r.centre.ville ?? "")}</strong>
                          <span>{r.centre.nom}</span>
                          <small>
                            <MapPin size={12} aria-hidden /> {r.centre.adresse} ·{" "}
                            <Phone size={12} aria-hidden />{" "}
                            <bdi dir="ltr">{r.centre.telephone}</bdi>
                          </small>
                        </div>
                        <ul className="group-dots" aria-label={t("stockLevels")}>
                          {r.stock.map((s) => (
                            <li
                              key={s.groupeSanguin}
                              title={`${s.groupeSanguin} : ${t(levelKey(stockLevel(s)))}`}
                            >
                              <i style={{ background: dotColor[stockLevel(s)] }} />
                              {s.groupeSanguin}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <section className="surface">
                <h2 className="surface-title" style={{ marginBottom: 18 }}>
                  {t("whoCanGive")}
                </h2>
                <div className="rule-grid">
                  <div>
                    <UserCheck size={22} aria-hidden />
                    <strong>{t("ruleAge")}</strong>
                    <span>{t("ruleAgeText")}</span>
                  </div>
                  <div>
                    <Scale size={22} aria-hidden />
                    <strong>{t("ruleWeight")}</strong>
                    <span>{t("ruleWeightText")}</span>
                  </div>
                  <div>
                    <CalendarClock size={22} aria-hidden />
                    <strong>{t("ruleDelay")}</strong>
                    <span>{t("ruleDelayText")}</span>
                  </div>
                </div>
                <p style={{ margin: "16px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                  {t("rulesNote")}
                </p>
              </section>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function levelKey(level: "critical" | "low" | "ok") {
  return level === "critical" ? "levelCritical" : level === "low" ? "levelLow" : "levelOk";
}
