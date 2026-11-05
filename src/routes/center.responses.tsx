import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { requestApi } from "@/api/requestApi";
import type { DemandeDon, DonorResponse } from "@/api/models";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { isRequestExpired } from "@/lib/stock";
import { RoleGuard } from "@/components/role-guard";
import { AppShell, EmptyState, PageError, PageLoading } from "@/components/app-shell";

export const Route = createFileRoute("/center/responses")({
  validateSearch: (search: Record<string, unknown>) => ({
    request: Number(search["request"]) || 0,
  }),
  head: () => ({ meta: [{ title: "Réponses des donneurs — Idammen" }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterResponsesPage />
    </RoleGuard>
  ),
});

const reponseClass: Record<string, string> = {
  CONFIRME: "good",
  DECLINE: "muted",
  SANS_REPONSE: "warn",
};

function CenterResponsesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { request: requestId } = useSearch({ from: "/center/responses" });
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<DemandeDon[]>([]);
  const [rows, setRows] = useState<DonorResponse[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const list = (await requestApi.list()).filter((r) => !isRequestExpired(r));
      setRequests(list);
      // Without ?request=ID, open the first active request instead of an empty page.
      const selected = requestId || list[0]?.id || 0;
      if (selected && selected !== requestId) {
        void navigate({ to: "/center/responses", search: { request: selected }, replace: true });
        return;
      }
      setRows(selected ? await requestApi.responses(selected) : []);
      setState("ready");
    } catch (e) {
      setError(errorMessage(e, t));
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function validate(donId: number) {
    setBusyId(donId);
    try {
      await requestApi.validate(donId);
      setRows((list) =>
        list.map((r) => (r.don.id === donId ? { ...r, don: { ...r.don, statut: "VALIDE" } } : r)),
      );
      toast.success(t("donationValidated"));
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setBusyId(null);
    }
  }

  const current = requests.find((r) => r.id === requestId);
  const confirmed = rows.filter((r) => r.reponse === "CONFIRME").length;

  return (
    <AppShell space="center" title={t("responses")} intro={t("responseIntro")}>
      {state === "loading" && <PageLoading />}
      {state === "error" && <PageError message={error} onRetry={() => void load()} />}

      {state === "ready" && requests.length === 0 && (
        <EmptyState>{t("noActiveRequest")}</EmptyState>
      )}

      {state === "ready" && requests.length > 0 && (
        <>
          <section className="surface">
            <div className="field" style={{ maxWidth: 520 }}>
              <label htmlFor="request-select">{t("request")}</label>
              <select
                id="request-select"
                value={requestId}
                onChange={(e) =>
                  void navigate({
                    to: "/center/responses",
                    search: { request: Number(e.target.value) },
                  })
                }
              >
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.groupeSanguinDemande} · {t("bags", { count: r.quantiteNecessaire })} ·{" "}
                    {t(r.urgence, r.urgence)} — {formatDateTime(r.dateExpiration)}
                  </option>
                ))}
              </select>
            </div>
            {current && (
              <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
                {t("confirmedCount", { count: confirmed, total: current.quantiteNecessaire })}
              </p>
            )}
          </section>

          <section className="surface" style={{ overflowX: "auto" }}>
            {rows.length === 0 ? (
              <EmptyState>{t("noResponses")}</EmptyState>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("fullName")}</th>
                    <th>{t("bloodGroup")}</th>
                    <th>{t("phone")}</th>
                    <th>{t("answer")}</th>
                    <th>{t("donation")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.don.id}>
                      <td>
                        <strong>{r.donneur.nom}</strong>
                        <div
                          style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4 }}
                        >
                          {formatDateTime(r.don.datePrelevement)}
                        </div>
                      </td>
                      <td>
                        <span className="blood-badge">{r.donneur.groupeSanguin}</span>
                      </td>
                      <td dir="ltr" style={{ textAlign: "start" }}>
                        {r.donneur.telephone}
                      </td>
                      <td>
                        <span className={`status ${reponseClass[r.reponse] ?? "muted"}`}>
                          {t(r.reponse, r.reponse)}
                        </span>
                      </td>
                      <td>
                        {r.don.statut === "VALIDE" ? (
                          <span className="status good">
                            <CheckCircle2 size={12} aria-hidden /> {t("VALIDE")}
                          </span>
                        ) : r.reponse === "CONFIRME" ? (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            disabled={busyId === r.don.id}
                            onClick={() => void validate(r.don.id)}
                          >
                            {t("validateDonation")}
                          </button>
                        ) : (
                          <span className="status muted">{t(r.don.statut, r.don.statut)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
