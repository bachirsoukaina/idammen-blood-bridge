import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { donorApi } from "@/api/donorApi";
import { profileSchema } from "@/api/validation";
import { bloodGroups, cities, type Don, type Donneur, type Eligibility } from "@/api/models";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { RoleGuard } from "@/components/role-guard";
import { AppShell, PageError, PageLoading } from "@/components/app-shell";
import { DonorCard } from "@/components/donor/donor-card";
import { EligibilityPanel } from "@/components/donor/eligibility-panel";
import { NearbyCenters } from "@/components/donor/nearby-centers";

export const Route = createFileRoute("/donor/profile")({
  head: () => ({ meta: [{ title: "Mon profil — Idammen" }] }),
  component: () => (
    <RoleGuard role="DONNEUR">
      <DonorProfilePage />
    </RoleGuard>
  ),
});

type ProfileValues = {
  nom: string;
  email: string;
  telephone: string;
  groupeSanguin: string;
  sexe: string;
  dateNaissance: string;
  poids: string;
  latitude: string;
  longitude: string;
};

function toValues(d: Donneur): ProfileValues {
  return {
    nom: d.nom,
    email: d.email,
    telephone: d.telephone,
    groupeSanguin: d.groupeSanguin,
    sexe: d.sexe ?? "",
    dateNaissance: d.dateNaissance.slice(0, 10),
    poids: String(d.poids),
    latitude: String(d.latitude),
    longitude: String(d.longitude),
  };
}

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 20,
};

function DonorProfilePage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [donor, setDonor] = useState<Donneur | null>(null);
  const [donations, setDonations] = useState<Don[]>([]);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema) as unknown as Resolver<ProfileValues>,
  });
  const errors = form.formState.errors;

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [donor, elig, list] = await Promise.all([
        donorApi.me(),
        donorApi.eligibility(),
        donorApi.donations(),
      ]);
      form.reset(toValues(donor));
      setDonor(donor);
      setEligibility(elig);
      setDonations(list);
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

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await donorApi.update(values);
      form.reset(toValues(updated));
      setDonor(updated);
      toast.success(t("profileSaved", "Profil mis à jour"));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  });

  return (
    <AppShell
      space="donor"
      title={donor ? t("helloDonor", { name: donor.nom.split(" ")[0] }) : t("profile")}
      intro={t("donorIntro")}
    >
      {state === "loading" && <PageLoading />}

      {state === "error" && <PageError message={error} onRetry={() => void load()} />}

      {state === "ready" && eligibility && (
        <>
          {donor && (
            <>
              <div className="donor-top">
                <DonorCard donor={donor} />
                <EligibilityPanel donor={donor} eligibility={eligibility} donations={donations} />
              </div>
              <NearbyCenters donor={donor} />
            </>
          )}

          {/* Formulaire de profil */}
          <section style={card}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
              {t("personalInfo", "Mes informations")}
            </h2>
            <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16 }}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="nom">{t("name")}</label>
                  <input id="nom" {...form.register("nom")} />
                  {errors.nom && (
                    <span className="field-error">{t(errors.nom.message ?? "invalid")}</span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="email">{t("email")}</label>
                  <input id="email" type="email" {...form.register("email")} />
                  {errors.email && (
                    <span className="field-error">{t(errors.email.message ?? "invalid")}</span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="telephone">{t("phone")}</label>
                  <input id="telephone" type="tel" {...form.register("telephone")} />
                  {errors.telephone && (
                    <span className="field-error">{t(errors.telephone.message ?? "invalid")}</span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="groupeSanguin">{t("bloodGroup")}</label>
                  <select id="groupeSanguin" {...form.register("groupeSanguin")}>
                    {bloodGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {errors.groupeSanguin && (
                    <span className="field-error">
                      {t(errors.groupeSanguin.message ?? "invalid")}
                    </span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="sexe">{t("sex")}</label>
                  <select id="sexe" {...form.register("sexe")}>
                    <option value="">—</option>
                    <option value="M">{t("sexM")}</option>
                    <option value="F">{t("sexF")}</option>
                  </select>
                  {errors.sexe && (
                    <span className="field-error">{t(errors.sexe.message ?? "invalid")}</span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="dateNaissance">{t("birthDate")}</label>
                  <input id="dateNaissance" type="date" {...form.register("dateNaissance")} />
                  {errors.dateNaissance && (
                    <span className="field-error">
                      {t(errors.dateNaissance.message ?? "invalid")}
                    </span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="poids">{t("weight")}</label>
                  <input id="poids" type="number" min={1} {...form.register("poids")} />
                  {errors.poids && (
                    <span className="field-error">{t(errors.poids.message ?? "invalid")}</span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="city">{t("city")}</label>
                  <select
                    id="city"
                    defaultValue=""
                    onChange={(e) => {
                      const city = cities.find((c) => c.key === e.target.value);
                      if (city) {
                        form.setValue("latitude", String(city.latitude), { shouldDirty: true });
                        form.setValue("longitude", String(city.longitude), { shouldDirty: true });
                      }
                    }}
                  >
                    <option value="">{t("keepPosition", "Garder ma position actuelle")}</option>
                    {cities.map((c) => (
                      <option key={c.key} value={c.key}>
                        {t(c.key)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={form.formState.isSubmitting || !form.formState.isDirty}
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  border: 0,
                  borderRadius: 6,
                  padding: "12px 18px",
                  fontWeight: 700,
                  cursor: "pointer",
                  justifySelf: "start",
                  opacity: form.formState.isDirty ? 1 : 0.6,
                }}
              >
                {t("save", "Enregistrer")}
              </button>
            </form>
          </section>

          {/* Historique des dons */}
          <section style={card}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
              {t("donationHistory", "Historique de mes dons")}
            </h2>
            {donations.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
                {t("noDonations", "Vous n'avez pas encore donné.")}
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("center")}</th>
                      <th>{t("quantity")}</th>
                      <th>{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...donations]
                      .sort((a, b) => b.datePrelevement.localeCompare(a.datePrelevement))
                      .map((d) => (
                        <tr key={d.id}>
                          <td>{formatDate(d.datePrelevement)}</td>
                          <td>{d.centre?.nom ?? `#${d.centreId}`}</td>
                          <td>{t("bags", { count: d.quantite })}</td>
                          <td>
                            <span
                              className={`status ${d.statut === "VALIDE" ? "good" : d.statut === "ANNULE" ? "" : "warn"}`}
                            >
                              {t(d.statut)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
