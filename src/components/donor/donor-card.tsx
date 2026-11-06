import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

import type { Donneur } from "@/api/models";
import { LogoMark } from "@/components/logo";

/** Donor number shown on the card, e.g. BL-000042. */
function donorNumber(id: number) {
  return `BL-${String(id).padStart(6, "0")}`;
}

/**
 * Digital donor card. The QR code only holds the donor number: the center scans it
 * and looks the donor up in its own system, so no personal data travels in the code.
 */
export function DonorCard({ donor }: { donor: Donneur }) {
  const { t } = useTranslation();
  const number = donorNumber(donor.id);
  return (
    <section className="donor-card" aria-label={t("donorCard")}>
      <div className="donor-card-top">
        <span className="donor-card-brand">
          <LogoMark className="donor-card-logo" />
          <span>
            <strong>Idammen</strong>
            <small>{t("donorCard")}</small>
          </span>
        </span>
        <span className="donor-card-group" dir="ltr">
          {donor.groupeSanguin}
        </span>
      </div>
      <div className="donor-card-body">
        <div>
          <small>{t("fullName")}</small>
          <strong className="donor-card-name">{donor.nom}</strong>
          <small>{t("donorNumber")}</small>
          <strong dir="ltr">{number}</strong>
          {donor.ville && (
            <>
              <small>{t("city")}</small>
              <strong>{t(donor.ville, donor.ville)}</strong>
            </>
          )}
        </div>
        <div className="donor-card-qr">
          <QRCodeSVG value={`BLOODLINK:${number}`} size={96} level="M" marginSize={0} />
        </div>
      </div>
      <p className="donor-card-hint">{t("donorCardHint")}</p>
    </section>
  );
}
