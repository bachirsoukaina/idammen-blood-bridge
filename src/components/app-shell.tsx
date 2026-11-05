import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Activity,
  BarChart3,
  Bell,
  Droplets,
  Gift,
  LayoutDashboard,
  MapPinned,
  Siren,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { SiteHeader } from "./site-header";

type Space = "center" | "donor";
type NavItem = { to: string; key: string; icon: LucideIcon };

const navItems: Record<Space, NavItem[]> = {
  center: [
    { to: "/center/dashboard", key: "dashboard", icon: LayoutDashboard },
    { to: "/center/stock", key: "stock", icon: Droplets },
    { to: "/center/requests", key: "requests", icon: Siren },
    { to: "/center/responses", key: "responses", icon: Users },
    { to: "/center/map", key: "map", icon: MapPinned },
    { to: "/center/stats", key: "stats", icon: BarChart3 },
  ],
  donor: [
    { to: "/donor/profile", key: "profile", icon: UserRound },
    { to: "/donor/alerts", key: "alerts", icon: Bell },
    { to: "/donor/loyalty", key: "loyalty", icon: Gift },
  ],
};

/** Page frame shared by the center portal and the donor space: header, sidebar, page title. */
export function AppShell({
  space,
  title,
  intro,
  actions,
  children,
}: {
  space: Space;
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <>
      <SiteHeader />
      <div className="workspace">
        <aside className="sidebar">
          <p className="sidebar-title">{space === "center" ? t("centerSpace") : t("donorSpace")}</p>
          <nav aria-label={space === "center" ? t("centerSpace") : t("donorSpace")}>
            {navItems[space].map(({ to, key, icon: Icon }) => (
              // Cast: route paths are checked by the generated route tree at build time.
              <Link key={to} to={to as "/"} activeProps={{ "data-status": "active" }}>
                <Icon size={18} aria-hidden />
                <span>{t(key)}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="workspace-main">
          <div className="page-head">
            <div>
              <h1 className="page-title">{title}</h1>
              {intro && <p className="page-intro">{intro}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
          </div>
          <div className="stack">{children}</div>
        </main>
      </div>
    </>
  );
}

export function PageLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="empty-state">
      <div className="loading-spin" />
      {t("loading")}
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="alert-banner">
      <p style={{ margin: 0 }}>{message}</p>
      <button type="button" className="btn btn-outline" style={{ marginTop: 12 }} onClick={onRetry}>
        {t("retry")}
      </button>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="empty-state">
      <Activity
        size={28}
        aria-hidden
        style={{ margin: "0 auto 10px", display: "block", opacity: 0.5 }}
      />
      {children}
    </div>
  );
}
