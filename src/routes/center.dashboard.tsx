import { useCallback, useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, ClipboardCheck, Droplets, Plus, Siren } from "lucide-react";

import { centerApi } from "@/api/centerApi";
import { requestApi } from "@/api/requestApi";
import type { Centre, DemandeDon, DonorResponse, StockSang } from "@/api/models";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import {
  gaugeMax,
  isRequestExpired,
  levelStatusClass,
  stockLevel,
  urgenceStatusClass,
} from "@/lib/stock";
import { RoleGuard } from "@/components/role-guard";
import { AppShell, EmptyState, PageError, PageLoading } from "@/components/app-shell";

export const Route = createFileRoute("/center/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — Idammen" }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterDashboardPage />
    </RoleGuard>
  ),
});

const levelKey = { critical: "levelCritical", low: "levelLow", ok: "levelOk" } as const;

type Pending = DonorResponse & { demande: DemandeDon };

function CenterDashboardPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [center, setCenter] = useState<Centre | null>(null);
  const [stock, setStock] = useState<StockSang[]>([]);
  const [requests, setRequests] = useState<DemandeDon[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [c, s, r] = await Promise.all([centerApi.me(), centerApi.stock(), requestApi.list()]);
      const active = r.filter((d) => !isRequestExpired(d));
      // Donors who confirmed and still have to be validated at the center.
      const responses = await Promise.all(
        active.map((d) =>
          requestApi.responses(d.id).then((rows) => rows.map((row) => ({ ...row, demande: d }))),
        ),
      );
      setCenter(c);
      setStock(s);
      setRequests(r);
      setPending(
        responses
          .flat()
          .filter((row) => row.reponse === "CONFIRME" && row.don.statut === "PLANIFIE"),
      );
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

  const active = requests.filter((r) => !isRequestExpired(r));
  const below = stock.filter((s) => stockLevel(s) !== "ok");
  const total = stock.reduce((n, s) => n + s.quantitePoches, 0);
  const max = gaugeMax(stock);

  return (
    <AppShell
      space="center"
      title={center?.nom ?? t("dashboard")}
      intro={center ? `${center.adresse} · ${t("centerIntro")}` : t("centerIntro")}
      actions={
        <Link to="/center/requests" className="btn btn-primary">
          <Plus size={16} aria-hidden /> {t("newRequest")}
        </Link>
      }
    >
      {state === "loading" && <PageLoading />}
      {state === "error" && <PageError message={error} onRetry={() => void load()} />}

      {state === "ready" && (
        <>
          <div className="kpi-grid">
            <Kpi icon={<Droplets size={20} />} tone="info" value={total} label={t("totalBags")} />
            <Kpi
              icon={<AlertTriangle size={20} />}
              tone={below.length ? "" : "good"}
              value={below.length}
              label={t("lowStock")}
            />
            <Kpi
              icon={<Siren size={20} />}
              tone="warn"
              value={active.length}
              label={t("activeRequests")}
            />
            <Kpi
              icon={<ClipboardCheck size={20} />}
              tone="good"
              value={pending.length}
              label={t("toValidate")}
            />
          </div>

          {below.some((s) => stockLevel(s) === "critical") && (
            <div className="alert-banner" role="status">
              <strong>{t("criticalAlert")}</strong>{" "}
              <bdi dir="ltr">
                {below
                  .filter((s) => stockLevel(s) === "critical")
                  .map((s) => s.groupeSanguin)
                  .join(", ")}
              </bdi>
            </div>
          )}

          <div className="dash-grid">
            <section className="surface">
              <div className="surface-head">
                <h2 className="surface-title">{t("stockLevels")}</h2>
                <Link to="/center/stock" className="link-more">
                  {t("manageStock")} <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
              <div className="level-list">
                {stock.map((s) => {
                  const level = stockLevel(s);
                  return (
                    <div key={s.id} className="level-row">
                      <span className="blood-badge">{s.groupeSanguin}</span>
                      <div
                        className="level-bar"
                        role="meter"
                        aria-label={s.groupeSanguin}
                        aria-valuemin={0}
                        aria-valuemax={max}
                        aria-valuenow={s.quantitePoches}
                      >
                        <div
                          className={`level-fill ${level === "ok" ? "" : level}`}
                          style={{ width: `${(s.quantitePoches / max) * 100}%` }}
                        />
                        <div
                          className="level-marker"
                          style={{ insetInlineStart: `${(s.seuilAlerte / max) * 100}%` }}
                          title={`${t("threshold")} ${s.seuilAlerte}`}
                        />
                      </div>
                      <div className="level-meta">
                        <strong>{s.quantitePoches}</strong> / {s.seuilAlerte}
                        <div>
                          <span className={`status ${levelStatusClass[level]}`}>
                            {t(levelKey[level])}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="level-legend">
                <span>
                  <i style={{ background: "var(--success)" }} />
                  {t("levelOk")}
                </span>
                <span>
                  <i style={{ background: "var(--ochre)" }} />
                  {t("levelLow")}
                </span>
                <span>
                  <i style={{ background: "var(--primary)" }} />
                  {t("levelCritical")}
                </span>
                <span>
                  <i style={{ background: "var(--foreground)", opacity: 0.45, width: 2 }} />
                  {t("threshold")}
                </span>
              </div>
            </section>

            <div className="stack">
              <section className="surface">
                <div className="surface-head">
                  <h2 className="surface-title">{t("requests")}</h2>
                  <Link to="/center/requests" className="link-more">
                    {t("seeAll")} <ArrowRight size={14} aria-hidden />
                  </Link>
                </div>
                {active.length === 0 ? (
                  <EmptyState>{t("noActiveRequest")}</EmptyState>
                ) : (
                  <div className="row-list">
                    {active.map((r) => (
                      <Link
                        key={r.id}
                        to="/center/responses"
                        search={{ request: r.id }}
                        className="row-item"
                        style={{ color: "inherit" }}
                      >
                        <span className="row-main">
                          <span className="blood-badge">{r.groupeSanguinDemande}</span>
                          <strong>{t("bags", { count: r.quantiteNecessaire })}</strong>
                          <span className={`status ${urgenceStatusClass[r.urgence] ?? ""}`}>
                            {t(r.urgence, r.urgence)}
                          </span>
                        </span>
                        <small>{t("expiration", { date: formatDateTime(r.dateExpiration) })}</small>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="surface">
                <div className="surface-head">
                  <h2 className="surface-title">{t("toValidate")}</h2>
                  {pending.length > 5 && (
                    <Link to="/center/responses" search={{ request: 0 }} className="link-more">
                      {t("seeAll")} ({pending.length}) <ArrowRight size={14} aria-hidden />
                    </Link>
                  )}
                </div>
                {pending.length === 0 ? (
                  <EmptyState>{t("nothingToValidate")}</EmptyState>
                ) : (
                  <div className="row-list">
                    {pending.slice(0, 5).map((p) => (
                      <div key={p.don.id} className="row-item">
                        <span className="row-main">
                          <span className="blood-badge">{p.donneur.groupeSanguin}</span>
                          <strong>{p.donneur.nom}</strong>
                        </span>
                        <Link
                          to="/center/responses"
                          search={{ request: p.demande.id }}
                          className="btn btn-success btn-sm"
                        >
                          {t("validateDonation")}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Kpi({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: string;
  value: number;
  label: string;
}) {
  return (
    <div className="kpi">
      <div className={`kpi-icon ${tone}`} aria-hidden>
        {icon}
      </div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
