import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Bell, CalendarCheck, Droplet, HeartPulse } from "lucide-react";

import type { Don, Donneur, Eligibility } from "@/api/models";
import { formatDate } from "@/lib/format";

const DAY = 24 * 3600 * 1000;

/** Countdown ring until the donor can give blood again, plus a few personal figures. */
export function EligibilityPanel({
  donor,
  eligibility,
  donations,
}: {
  donor: Donneur;
  eligibility: Eligibility;
  donations: Don[];
}) {
  const { t } = useTranslation();
  const next = new Date(eligibility.dateEligibilite).getTime();
  const last = donor.dateDernierDon ? new Date(donor.dateDernierDon).getTime() : null;
  const daysLeft = Math.max(0, Math.ceil((next - Date.now()) / DAY));
  // Share of the waiting period already done (100 % when the donor can give).
  const progress =
    eligibility.eligible || !last
      ? 1
      : Math.min(1, Math.max(0, (Date.now() - last) / (next - last)));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const validated = donations.filter((d) => d.statut === "VALIDE");

  return (
    <section className="surface eligibility-panel">
      <div className="eligibility-ring">
        <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--muted)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={eligibility.eligible ? "var(--success)" : "var(--ochre)"}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="eligibility-ring-label">
          {eligibility.eligible ? (
            <HeartPulse size={30} aria-hidden style={{ color: "var(--success)" }} />
          ) : (
            <>
              <strong>{daysLeft}</strong>
              <small>{t("daysUnit", { count: daysLeft })}</small>
            </>
          )}
        </div>
      </div>

      <div className="eligibility-text">
        <span className={`status ${eligibility.eligible ? "good" : "warn"}`}>
          {eligibility.eligible ? t("eligible") : t("notEligible")}
        </span>
        <h2>{eligibility.eligible ? t("canGiveNow") : t("nextDonationIn", { count: daysLeft })}</h2>
        <p>
          {eligibility.eligible
            ? t("canGiveNowText")
            : t("eligibleOn", { date: formatDate(eligibility.dateEligibilite) })}
        </p>
        {eligibility.eligible && (
          <Link
            to="/donor/alerts"
            className="btn btn-primary btn-sm"
            style={{ justifySelf: "start" }}
          >
            <Bell size={14} aria-hidden /> {t("seeMyAlerts")}
          </Link>
        )}
      </div>

      <dl className="donor-figures">
        <div>
          <Droplet size={18} aria-hidden />
          <dt>{t("totalDonations")}</dt>
          <dd>{validated.length}</dd>
        </div>
        <div>
          <CalendarCheck size={18} aria-hidden />
          <dt>{t("lastDonation")}</dt>
          <dd>{formatDate(donor.dateDernierDon)}</dd>
        </div>
        <div>
          <HeartPulse size={18} aria-hidden />
          <dt>{t("livesHelped")}</dt>
          <dd>{validated.length * 3}</dd>
        </div>
      </dl>
    </section>
  );
}
