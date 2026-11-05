import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { centerApi } from "@/api/centerApi";
import type { Donneur } from "@/api/models";
import { errorMessage } from "@/lib/errors";
import { RoleGuard } from "@/components/role-guard";
import { AppShell, PageError, PageLoading } from "@/components/app-shell";
import { MapView } from "@/components/map/map-view";

export const Route = createFileRoute("/center/map")({
  head: () => ({ meta: [{ title: "Carte des donneurs — Idammen" }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterMapPage />
    </RoleGuard>
  ),
});

function CenterMapPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [center, setCenter] = useState<Awaited<ReturnType<typeof centerApi.me>> | null>(null);
  const [donors, setDonors] = useState<Donneur[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [c, list] = await Promise.all([centerApi.me(), centerApi.nearby()]);
      setCenter(c);
      setDonors(list);
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

  return (
    <AppShell space="center" title={t("map")} intro={t("mapIntro")}>
      {state === "loading" && <PageLoading />}

      {state === "error" && <PageError message={error} onRetry={() => void load()} />}

      {state === "ready" && center && (
        <>
          <MapView
            large
            center={[center.latitude, center.longitude]}
            zoom={11}
            markers={[
              {
                latitude: center.latitude,
                longitude: center.longitude,
                label: center.nom,
                detail: center.adresse,
                kind: "center",
              },
              ...donors.map((d) => ({
                latitude: d.latitude,
                longitude: d.longitude,
                label: d.nom,
                detail: `${d.groupeSanguin} · ${d.statutEligibilite === "NON_ELIGIBLE" ? t("notEligible") : t("eligible")}`,
                kind:
                  d.statutEligibilite === "NON_ELIGIBLE"
                    ? ("ineligible" as const)
                    : ("eligible" as const),
              })),
            ]}
          />
          <section className="surface" style={{ overflowX: "auto" }}>
            <div className="surface-head">
              <h2 className="surface-title">{t("nearbyDonors")}</h2>
              <span className="status good">
                {donors.filter((d) => d.statutEligibilite !== "NON_ELIGIBLE").length}{" "}
                {t("eligible")}
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("fullName")}</th>
                  <th>{t("bloodGroup")}</th>
                  <th>{t("phone")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.nom}</strong>
                    </td>
                    <td>
                      <span className="blood-badge">{d.groupeSanguin}</span>
                    </td>
                    <td dir="ltr" style={{ textAlign: "start" }}>
                      {d.telephone}
                    </td>
                    <td>
                      {d.statutEligibilite === "NON_ELIGIBLE" ? (
                        <span className="status muted">{t("notEligible")}</span>
                      ) : (
                        <span className="status good">{t("eligible")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </AppShell>
  );
}
