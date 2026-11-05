import { useCallback, useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { requestApi } from "@/api/requestApi";
import { requestSchema } from "@/api/validation";
import { bloodGroups, type DemandeDon } from "@/api/models";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { RoleGuard } from "@/components/role-guard";
import { AppShell, EmptyState, PageError, PageLoading } from "@/components/app-shell";
import { isRequestExpired } from "@/lib/stock";
import { urgenceStatusClass } from "./center.dashboard";

export const Route = createFileRoute("/center/requests")({
  head: () => ({ meta: [{ title: "Demandes urgentes — Idammen" }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterRequestsPage />
    </RoleGuard>
  ),
});

type RequestValues = {
  groupeSanguinDemande: string;
  quantiteNecessaire: string;
  urgence: string;
  dateExpiration: string;
};

function CenterRequestsPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<DemandeDon[]>([]);

  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema) as unknown as Resolver<RequestValues>,
    defaultValues: {
      groupeSanguinDemande: "O+",
      quantiteNecessaire: "5",
      urgence: "URGENTE",
      dateExpiration: "",
    },
  });
  const errors = form.formState.errors;

  const load = useCallback(async () => {
    setState("loading");
    try {
      setRequests(await requestApi.list());
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
      const created = await requestApi.create(values);
      setRequests((list) => [created, ...list]);
      form.reset({
        groupeSanguinDemande: "O+",
        quantiteNecessaire: "5",
        urgence: "URGENTE",
        dateExpiration: "",
      });
      toast.success(t("requestCreated"));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  });

  return (
    <AppShell space="center" title={t("requests")} intro={t("requestIntro")}>
      {state === "loading" && <PageLoading />}
      {state === "error" && <PageError message={error} onRetry={() => void load()} />}

      {state === "ready" && (
        <div className="dash-grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)" }}>
          <section className="surface">
            <div className="surface-head">
              <h2 className="surface-title">{t("newRequest")}</h2>
            </div>
            <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16 }}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="groupeSanguinDemande">{t("bloodGroup")}</label>
                  <select id="groupeSanguinDemande" {...form.register("groupeSanguinDemande")}>
                    {bloodGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {errors.groupeSanguinDemande && (
                    <span className="field-error">{errors.groupeSanguinDemande.message}</span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="quantiteNecessaire">{t("quantity")}</label>
                  <input
                    id="quantiteNecessaire"
                    type="number"
                    min={1}
                    {...form.register("quantiteNecessaire")}
                  />
                  {errors.quantiteNecessaire && (
                    <span className="field-error">{errors.quantiteNecessaire.message}</span>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="urgence">{t("urgency")}</label>
                  <select id="urgence" {...form.register("urgence")}>
                    {(["NORMALE", "URGENTE", "CRITIQUE"] as const).map((u) => (
                      <option key={u} value={u}>
                        {t(u, u)}
                      </option>
                    ))}
                  </select>
                  {errors.urgence && <span className="field-error">{errors.urgence.message}</span>}
                </div>
                <div className="field">
                  <label htmlFor="dateExpiration">{t("expiryDate")}</label>
                  <input
                    id="dateExpiration"
                    type="datetime-local"
                    {...form.register("dateExpiration")}
                  />
                  {errors.dateExpiration && (
                    <span className="field-error">{errors.dateExpiration.message}</span>
                  )}
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ justifySelf: "start" }}
                disabled={form.formState.isSubmitting}
              >
                {t("publishRequest")}
              </button>
            </form>
          </section>

          <section className="surface">
            <div className="surface-head">
              <h2 className="surface-title">{t("track")}</h2>
            </div>
            {requests.length === 0 ? (
              <EmptyState>{t("empty")}</EmptyState>
            ) : (
              <div className="row-list">
                {requests.map((r) => {
                  const expired = isRequestExpired(r);
                  return (
                    <article key={r.id} className="row-item" style={{ opacity: expired ? 0.6 : 1 }}>
                      <span className="row-main">
                        <span className="blood-badge">{r.groupeSanguinDemande}</span>
                        <strong>{t("bags", { count: r.quantiteNecessaire })}</strong>
                        <span className={`status ${urgenceStatusClass[r.urgence] ?? ""}`}>
                          {t(r.urgence, r.urgence)}
                        </span>
                        {expired && <span className="status muted">{t("EXPIREE")}</span>}
                      </span>
                      <span className="row-main">
                        <small>{t("expiration", { date: formatDateTime(r.dateExpiration) })}</small>
                        {!expired && (
                          <Link
                            to="/center/responses"
                            search={{ request: r.id }}
                            className="btn btn-outline btn-sm"
                          >
                            {t("viewResponses")}
                          </Link>
                        )}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
