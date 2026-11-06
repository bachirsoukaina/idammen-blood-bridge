import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  Droplets,
  Gift,
  HandHeart,
  ShieldCheck,
  Siren,
} from "lucide-react";

import heroPhoto from "@/assets/idammen-community.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MapView } from "@/components/map/map-view";
import { cities, bloodGroups } from "@/api/models";
import { ReserveDrop } from "@/components/reserves/reserve-drop";
import { useReserves } from "@/hooks/use-reserves";
import { nationalReserves, worstLevel } from "@/lib/reserves";
import { stockLevel } from "@/lib/stock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Idammen — Donner son sang, donner la vie" },
      {
        name: "description",
        content:
          "Idammen relie les donneurs de sang aux centres de transfusion du Maroc : alertes urgentes, profil donneur, fidélité et stocks des centres.",
      },
      { property: "og:title", content: "Idammen — Donner son sang, donner la vie" },
      {
        property: "og:description",
        content: "Ensemble, relions les donneurs aux centres de transfusion du Maroc.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const COMPAT: { group: string; gives: string; receives: string }[] = [
  { group: "O-", gives: "allGroups", receives: "O-" },
  { group: "O+", gives: "O+, A+, B+, AB+", receives: "O+, O-" },
  { group: "A-", gives: "A+, A-, AB+, AB-", receives: "A-, O-" },
  { group: "A+", gives: "A+, AB+", receives: "A+, A-, O+, O-" },
  { group: "B-", gives: "B+, B-, AB+, AB-", receives: "B-, O-" },
  { group: "B+", gives: "B+, AB+", receives: "B+, B-, O+, O-" },
  { group: "AB-", gives: "AB+, AB-", receives: "AB-, A-, B-, O-" },
  { group: "AB+", gives: "AB+", receives: "allGroups" },
];

function Home() {
  const { t } = useTranslation();
  const { reserves } = useReserves();
  const national = nationalReserves(reserves);
  const totalBags = national.reduce((n, r) => n + r.quantitePoches, 0);
  const tension = national.filter((r) => stockLevel(r) !== "ok").length;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <img src={heroPhoto} alt={t("photoAlt")} className="hero-photo" />
          <div className="hero-content container-id">
            <div className="hero-content-inner">
              <span className="eyebrow">Idammen · {t("technical")}</span>
              <h1>{t("brand")}</h1>
              <span className="tifinagh-title">{t("tifinagh")}</span>
              <p className="hero-tagline">{t("tagline")}</p>
              <p className="hero-description">{t("heroDescription")}</p>
              <div className="hero-actions">
                <Link
                  to="/register"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  <HandHeart size={16} /> {t("register")}
                </Link>
                <Link
                  to="/login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--card)",
                    color: "var(--primary)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  {t("login")}
                </Link>
              </div>
              <div className="community-proof">
                <span className="avatar-stack">
                  {["ي", "A", "ⵣ", "S", "M"].map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </span>
                {t("proof")}
              </div>
            </div>
          </div>
          <div className="hero-note">
            <span
              className="drop-motion"
              style={{ color: "var(--primary)", display: "inline-flex" }}
            >
              <HandHeart />
            </span>
            <span>
              <strong>{t("heroNote")}</strong>
              <small>{t("heroNoteSub")}</small>
            </span>
          </div>
        </section>

        <section className="stat-strip" aria-label={t("todayReserves")}>
          <div className="container-id stat-grid">
            <div className="stat-item">
              <span className="stat-icon">
                <Building2 size={22} />
              </span>
              <span>
                <span className="stat-number">{reserves.length || "—"}</span>
                <span className="stat-label">{t("partners")}</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">
                <Droplets size={22} />
              </span>
              <span>
                <span className="stat-number">
                  {totalBags ? totalBags.toLocaleString("fr-FR") : "—"}
                </span>
                <span className="stat-label">{t("bagsNational")}</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">
                <Siren size={22} />
              </span>
              <span>
                <span className="stat-number">{reserves.length ? tension : "—"}</span>
                <span className="stat-label">{t("groupsInTension")}</span>
              </span>
            </div>
          </div>
        </section>

        {reserves.length > 0 && (
          <section className="section" id="reserves">
            <div className="container-id">
              <div className="surface-head" style={{ marginBottom: 26 }}>
                <div>
                  <span className="eyebrow">{t("reserves")}</span>
                  <h2 className="section-title">{t("todayReserves")}</h2>
                  <p className="section-description">{t("todayReservesText")}</p>
                </div>
                <Link to="/reserves" className="btn btn-outline">
                  {t("seeReserves")} <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
              <div className="drop-grid">
                {national.map((r) => (
                  <ReserveDrop key={r.groupeSanguin} reserve={r} size={76} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section" id="how">
          <div className="container-id">
            <span className="eyebrow">{t("simpleEyebrow")}</span>
            <h2 className="section-title">{t("how")}</h2>
            <p className="section-description">{t("howDescription")}</p>
            <div className="steps">
              {[1, 2, 3, 4].map((n) => {
                const Icon = [Bell, Building2, CheckCircle2, Gift][n - 1] as typeof Bell;
                return (
                  <article className="step" key={n}>
                    <div className="step-num">0{n}</div>
                    <div className="step-icon">
                      <Icon size={24} />
                    </div>
                    <h3>{t(`step${n}`)}</h3>
                    <p>{t(`step${n}Desc`)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section section-alternate" id="centers">
          <div className="container-id city-grid">
            <div>
              <span className="eyebrow">{t("nearEyebrow")}</span>
              <h2 className="section-title">{t("cityTitle")}</h2>
              <p className="section-description">{t("cityDescription")}</p>
              <div className="city-list">
                {cities.map((c) => (
                  <span key={c.key}>
                    <span className="map-dot" />
                    {t(c.key)}
                  </span>
                ))}
              </div>
            </div>
            <MapView
              center={[31.8, -7.5]}
              zoom={5}
              markers={reserves.map((r) => ({
                latitude: r.centre.latitude,
                longitude: r.centre.longitude,
                label: r.centre.nom,
                detail: r.centre.adresse,
                kind: worstLevel(r.stock),
              }))}
            />
          </div>
        </section>

        <section className="section">
          <div className="container-id">
            <div className="pro-band">
              <div>
                <span className="eyebrow" style={{ color: "var(--ochre)" }}>
                  <ShieldCheck size={14} aria-hidden /> {t("proSpace")}
                </span>
                <h2>{t("proBandTitle")}</h2>
                <p>{t("proBandText")}</p>
              </div>
              <Link to="/login" search={{ espace: "centre" }} className="btn btn-primary">
                {t("proBandCta")} <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <section className="section" id="compat">
          <div className="container-id compat-grid">
            <div>
              <span className="eyebrow">{t("compatEyebrow")}</span>
              <h2 className="section-title">{t("compatTitle")}</h2>
              <p className="section-description">{t("compatDescription")}</p>
              <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {bloodGroups.map((g) => (
                  <span key={g} className="blood-badge">
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("bloodGroup")}</th>
                  <th>{t("givesTo")}</th>
                  <th>{t("receivesFrom")}</th>
                </tr>
              </thead>
              <tbody>
                {COMPAT.map((row) => (
                  <tr key={row.group}>
                    <td>
                      <span className="blood-badge">{row.group}</span>
                    </td>
                    <td>{row.gives === "allGroups" ? t("allGroups") : row.gives}</td>
                    <td>{row.receives === "allGroups" ? t("allGroups") : row.receives}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
