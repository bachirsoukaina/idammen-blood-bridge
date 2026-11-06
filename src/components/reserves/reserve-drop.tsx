import { useId } from "react";
import { useTranslation } from "react-i18next";

import type { ReserveGroupe } from "@/api/models";
import { fillPercent } from "@/lib/reserves";
import { stockLevel } from "@/lib/stock";

const levelColor = { critical: "var(--primary)", low: "var(--ochre)", ok: "var(--success)" };
const levelKey = { critical: "levelCritical", low: "levelLow", ok: "levelOk" } as const;

/** Blood-drop gauge: the drop fills up with the reserve level of one blood group. */
export function ReserveDrop({ reserve, size = 88 }: { reserve: ReserveGroupe; size?: number }) {
  const { t } = useTranslation();
  const clip = useId();
  const level = stockLevel(reserve);
  const fill = fillPercent(reserve);
  const top = 100 - fill;
  return (
    <figure
      className="reserve-drop"
      aria-label={`${reserve.groupeSanguin} : ${t(levelKey[level])}`}
    >
      <svg viewBox="0 0 60 80" width={size * 0.75} height={size} aria-hidden>
        <defs>
          <clipPath id={clip}>
            <path d="M30 2 C30 2 4 34 4 52 a26 26 0 0 0 52 0 C56 34 30 2 30 2 Z" />
          </clipPath>
        </defs>
        <path d="M30 2 C30 2 4 34 4 52 a26 26 0 0 0 52 0 C56 34 30 2 30 2 Z" fill="var(--muted)" />
        <rect
          x="0"
          y={top * 0.8}
          width="60"
          height="80"
          fill={levelColor[level]}
          clipPath={`url(#${clip})`}
          className="reserve-fill"
        />
        <path
          d="M30 2 C30 2 4 34 4 52 a26 26 0 0 0 52 0 C56 34 30 2 30 2 Z"
          fill="none"
          stroke={levelColor[level]}
          strokeWidth="2.5"
        />
        <text x="30" y="58" textAnchor="middle" className="reserve-group">
          {reserve.groupeSanguin}
        </text>
      </svg>
      <figcaption>
        <span className={`status ${level === "ok" ? "good" : level === "low" ? "warn" : ""}`}>
          {t(levelKey[level])}
        </span>
      </figcaption>
    </figure>
  );
}
