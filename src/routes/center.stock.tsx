import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { centerApi } from "@/api/centerApi";
import type { StockSang } from "@/api/models";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { RoleGuard } from "@/components/role-guard";
import { AppShell, PageError, PageLoading } from "@/components/app-shell";
import { levelStatusClass, stockLevel } from "@/lib/stock";

export const Route = createFileRoute("/center/stock")({
  head: () => ({ meta: [{ title: "Stock sanguin — Idammen" }] }),
  component: () => (
    <RoleGuard role="CENTRE">
      <CenterStockPage />
    </RoleGuard>
  ),
});

const levelKey = { critical: "levelCritical", low: "levelLow", ok: "levelOk" } as const;

function CenterStockPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [stock, setStock] = useState<StockSang[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const list = await centerApi.stock();
      setStock(list);
      setDraft(Object.fromEntries(list.map((s) => [s.id, String(s.seuilAlerte)])));
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

  async function save(row: StockSang) {
    setBusyId(row.id);
    try {
      const updated = await centerApi.updateStock(row.id, { seuilAlerte: Number(draft[row.id]) });
      setStock((list) =>
        list.map((s) =>
          s.id === row.id
            ? { ...updated, groupeSanguin: updated.groupeSanguin ?? row.groupeSanguin }
            : s,
        ),
      );
      toast.success(t("saved"));
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell space="center" title={t("stock")} intro={t("stockIntro")}>
      {state === "loading" && <PageLoading />}
      {state === "error" && <PageError message={error} onRetry={() => void load()} />}

      {state === "ready" && (
        <div className="stock-grid">
          {stock.map((s) => {
            const level = stockLevel(s);
            return (
              <section key={s.id} className={`stock-card ${level === "ok" ? "" : level}`}>
                <div className="stock-card-head">
                  <span className="blood-badge" style={{ fontSize: 15 }}>
                    {s.groupeSanguin}
                  </span>
                  <span className={`status ${levelStatusClass[level]}`}>{t(levelKey[level])}</span>
                </div>
                <div className="stock-quantity">
                  {s.quantitePoches}
                  <small>{t("bagsUnit")}</small>
                </div>
                <small style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
                  {t("updatedAt", { date: formatDateTime(s.dateMAJ) })}
                </small>
                <form
                  className="stock-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(s);
                  }}
                >
                  <label htmlFor={`seuil-${s.id}`}>{t("threshold")}</label>
                  <div className="stock-form-row">
                    <input
                      id={`seuil-${s.id}`}
                      type="number"
                      min={0}
                      value={draft[s.id] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={
                        busyId === s.id ||
                        draft[s.id] === "" ||
                        Number(draft[s.id]) === s.seuilAlerte
                      }
                    >
                      {t("save")}
                    </button>
                  </div>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
