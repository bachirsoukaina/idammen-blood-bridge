import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";

import { useSession } from "@/hooks/use-session";
import { clearSession, roleHome } from "@/api/session";
import { Brand } from "./logo";
import { LanguageSelect } from "./language-select";

export function SiteHeader() {
  const { t } = useTranslation();
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = () => {
    clearSession();
    setOpen(false);
    void navigate({ to: "/", replace: true });
  };

  return (
    <header className="site-header">
      <div className="container-id header-inner">
        <Link to="/" aria-label="Idammen">
          <Brand />
        </Link>
        <nav aria-label="Principal" className="desktop-nav">
          <Link to="/" hash="how" className="nav-link" activeProps={{}}>
            {t("how")}
          </Link>
          <Link to="/reserves" className="nav-link" activeProps={{ "data-status": "active" }}>
            {t("reserves")}
          </Link>
          <Link to="/" hash="centers" className="nav-link" activeProps={{}}>
            {t("centers")}
          </Link>
          <Link to="/" hash="compat" className="nav-link" activeProps={{}}>
            {t("compatibility")}
          </Link>
        </nav>
        <div className="header-actions">
          <LanguageSelect />
          {session ? (
            <>
              {/* Cast: the donor/center routes are not in the generated route tree yet. */}
              <Link
                to={roleHome(session.role) as "/"}
                className="nav-link"
                style={{ fontWeight: 700 }}
              >
                {session.role === "CENTRE" ? t("centerSpace") : t("donorSpace")}
              </Link>
              <button type="button" className="nav-link" onClick={logout}>
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" search={{ espace: "centre" }} className="nav-link">
                {t("proSpace")}
              </Link>
              <Link to="/login" className="nav-link">
                {t("login")}
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                {t("register")}
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label={t("menu")}
          aria-expanded={open}
          className="menu-toggle"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label={t("menu")}>
          <Link to="/" onClick={() => setOpen(false)}>
            {t("home")}
          </Link>
          <Link to="/" hash="how" onClick={() => setOpen(false)}>
            {t("how")}
          </Link>
          <Link to="/reserves" onClick={() => setOpen(false)}>
            {t("reserves")}
          </Link>
          {session ? (
            <>
              <Link to={roleHome(session.role) as "/"} onClick={() => setOpen(false)}>
                {session.role === "CENTRE" ? t("centerSpace") : t("donorSpace")}
              </Link>
              <button type="button" onClick={logout}>
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" search={{ espace: "centre" }} onClick={() => setOpen(false)}>
                {t("proSpace")}
              </Link>
              <Link to="/login" onClick={() => setOpen(false)}>
                {t("login")}
              </Link>
              <Link to="/register" onClick={() => setOpen(false)}>
                {t("register")}
              </Link>
            </>
          )}
          <LanguageSelect />
        </nav>
      )}
    </header>
  );
}
