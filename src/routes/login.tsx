import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, HeartHandshake, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { authApi } from "@/api/authApi";
import { useMock } from "@/api/client";
import { loginSchema } from "@/api/validation";
import { decodeToken, roleHome, saveToken } from "@/api/session";
import { errorMessage } from "@/lib/errors";
import { AuthLayout } from "@/components/auth-layout";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — Idammen" },
      {
        name: "description",
        content: "Connectez-vous à votre espace donneur ou centre de transfusion Idammen.",
      },
      { property: "og:title", content: "Connexion — Idammen" },
      {
        property: "og:description",
        content: "Connectez-vous pour continuer à faire la différence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // ?espace=centre opens the center tab; without it the donor tab is shown.
  validateSearch: (search: Record<string, unknown>): { espace?: "centre" } =>
    search["espace"] === "centre" ? { espace: "centre" } : {},
  component: LoginPage,
});

type LoginValues = { email: string; password: string };

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { espace } = Route.useSearch();
  const isCenter = espace === "centre";
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const enter = (token: string) => {
    saveToken(token);
    const role = decodeToken(token)?.role ?? "DONNEUR";
    // Cast: the donor/center routes are not in the generated route tree yet.
    void navigate({ to: roleHome(role) as "/", replace: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { token } = await authApi.login(values);
      enter(token);
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  });

  const demo = async (role: "DONNEUR" | "CENTRE") => {
    try {
      const { token } = await authApi.demo(role);
      enter(token);
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  return (
    <>
      <SiteHeader />
      <AuthLayout
        title={isCenter ? t("proSpaceTitle") : t("welcome")}
        description={isCenter ? t("proSpaceDescription") : t("loginDescription")}
      >
        <div className="segmented" role="tablist" aria-label={t("login")}>
          <Link to="/login" search={{}} role="tab" aria-selected={!isCenter} activeProps={{}}>
            <HeartHandshake size={16} aria-hidden /> {t("donorRole")}
          </Link>
          <Link
            to="/login"
            search={{ espace: "centre" }}
            role="tab"
            aria-selected={isCenter}
            activeProps={{}}
          >
            <Building2 size={16} aria-hidden /> {t("centerRole")}
          </Link>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "22px 0 4px" }}>
          {isCenter ? t("proLogin") : t("login")}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
          {isCenter ? t("proLoginHint") : t("donorLoginHint")}
        </p>

        <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 16, marginTop: 20 }}>
          <div className="field">
            <label htmlFor="email">{isCenter ? t("proEmail") : t("email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={isCenter ? "crts.casablanca@sante.gov.ma" : "prenom.nom@exemple.ma"}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <span className="field-error">
                {t(form.formState.errors.email.message ?? "invalid")}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="password">{t("password")}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <span className="field-error">
                {t(form.formState.errors.password.message ?? "invalid")}
              </span>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ height: 46 }}
            disabled={form.formState.isSubmitting}
          >
            {t("login")}
          </button>
        </form>

        {isCenter ? (
          <p className="auth-note">
            <ShieldCheck size={16} aria-hidden /> {t("proAccountNote")}
          </p>
        ) : (
          <p style={{ marginTop: 18, fontSize: 13, color: "var(--muted-foreground)" }}>
            {t("noAccount")}{" "}
            <Link to="/register" style={{ color: "var(--primary)", fontWeight: 700 }}>
              {t("register")}
            </Link>
          </p>
        )}

        {/* Demo accounts only exist in mock mode (VITE_USE_MOCK is not "false"). */}
        {useMock && (
          <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <span className="eyebrow">{t("demoLogin")}</span>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => demo(isCenter ? "CENTRE" : "DONNEUR")}
            >
              {isCenter ? t("demoCenter") : t("demoDonor")}
            </button>
            <small
              style={{
                display: "block",
                marginTop: 8,
                color: "var(--muted-foreground)",
                fontSize: 11,
              }}
            >
              {t("demoHint")}
            </small>
          </div>
        )}
      </AuthLayout>
    </>
  );
}
