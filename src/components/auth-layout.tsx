import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { LogoMark } from "./logo";

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="auth-main">
      <div className="auth-art">
        <LogoMark className="brand-mark" />
        <span className="tifinagh-title">{t("tifinagh")}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="auth-panel">{children}</div>
    </div>
  );
}
