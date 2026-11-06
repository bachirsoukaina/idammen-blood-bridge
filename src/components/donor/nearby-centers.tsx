import { useTranslation } from "react-i18next";
import { MapPin, Phone } from "lucide-react";

import type { Donneur } from "@/api/models";
import { MapView } from "@/components/map/map-view";
import { useReserves } from "@/hooks/use-reserves";
import { distanceKm } from "@/lib/geo";
import { ltr } from "@/lib/format";
import { levelStatusClass, stockLevel } from "@/lib/stock";

const levelKey = { critical: "levelCritical", low: "levelLow", ok: "levelOk" } as const;

/** The three closest centers, with the reserve level of the donor's own blood group. */
export function NearbyCenters({ donor }: { donor: Donneur }) {
  const { t } = useTranslation();
  const { state, reserves } = useReserves();
  if (state !== "ready") return null;

  const closest = reserves
    .map((r) => ({ ...r, km: distanceKm(donor, r.centre) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);

  return (
    <section className="surface">
      <div className="surface-head">
        <h2 className="surface-title">{t("nearbyCenters")}</h2>
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          {t("myGroupLevel", { group: ltr(donor.groupeSanguin) })}
        </span>
      </div>
      <div className="dash-grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <div className="row-list">
          {closest.map((r) => {
            const mine = r.stock.find((s) => s.groupeSanguin === donor.groupeSanguin);
            const level = mine ? stockLevel(mine) : "ok";
            return (
              <article key={r.centre.id} className="center-card">
                <div>
                  <strong>{r.centre.nom}</strong>
                  <small>
                    <MapPin size={12} aria-hidden /> {r.centre.adresse} ·{" "}
                    {t("kmAway", { km: r.km < 10 ? r.km.toFixed(1) : Math.round(r.km) })}
                  </small>
                  <small>
                    <Phone size={12} aria-hidden /> <bdi dir="ltr">{r.centre.telephone}</bdi>
                  </small>
                </div>
                <span
                  className={`status ${levelStatusClass[level]}`}
                  style={{ justifySelf: "start" }}
                >
                  <bdi dir="ltr">{donor.groupeSanguin}</bdi> · {t(levelKey[level])}
                </span>
              </article>
            );
          })}
        </div>
        <MapView
          center={[donor.latitude, donor.longitude]}
          zoom={10}
          markers={[
            {
              latitude: donor.latitude,
              longitude: donor.longitude,
              label: t("myPosition"),
              kind: "me",
            },
            ...closest.map((r) => {
              const mine = r.stock.find((s) => s.groupeSanguin === donor.groupeSanguin);
              return {
                latitude: r.centre.latitude,
                longitude: r.centre.longitude,
                label: r.centre.nom,
                detail: r.centre.adresse,
                kind: mine ? stockLevel(mine) : ("ok" as const),
              };
            }),
          ]}
        />
      </div>
    </section>
  );
}
