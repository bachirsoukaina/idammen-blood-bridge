import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Brand } from "./logo";
import { LanguageSelect } from "./language-select";

function InfoDialog({
  open,
  onClose,
  title,
  body,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "oklch(.25 .024 26 / .5)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          color: "var(--foreground)",
          borderRadius: 8,
          maxWidth: 480,
          padding: 28,
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{title}</h2>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--muted-foreground)" }}>{body}</p>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 18,
            border: "1px solid var(--border)",
            background: "var(--card)",
            borderRadius: 5,
            padding: "9px 16px",
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<"privacy" | "contact" | null>(null);

  return (
    <footer className="footer">
      <div className="container-id">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 30,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Brand light />
          <div className="footer-links">
            <button type="button" className="language-select" onClick={() => setDialog("privacy")}>
              {t("privacy")}
            </button>
            <button type="button" className="language-select" onClick={() => setDialog("contact")}>
              {t("contact")}
            </button>
            <LanguageSelect />
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t("copyright")}</span>
          <span>{t("madeMorocco")}</span>
        </div>
      </div>
      <InfoDialog
        open={dialog === "privacy"}
        onClose={() => setDialog(null)}
        title={t("privacy")}
        body={t("privacyBody")}
      />
      <InfoDialog
        open={dialog === "contact"}
        onClose={() => setDialog(null)}
        title={t("contact")}
        body={t("contactBody")}
      />
    </footer>
  );
}
