import { bloodGroups, type ReserveCentre, type ReserveGroupe } from "@/api/models";
import { stockLevel, type StockLevel } from "./stock";

/** Réserves nationales : somme des poches et des seuils de tous les centres, groupe par groupe. */
export function nationalReserves(reserves: ReserveCentre[]): ReserveGroupe[] {
  return bloodGroups.map((g) => {
    const rows = reserves.flatMap((r) => r.stock.filter((s) => s.groupeSanguin === g));
    return {
      groupeSanguin: g,
      quantitePoches: rows.reduce((n, s) => n + s.quantitePoches, 0),
      seuilAlerte: rows.reduce((n, s) => n + s.seuilAlerte, 0),
    };
  });
}

/** Niveau le plus préoccupant d'un centre, pour colorer son marqueur sur la carte. */
export function worstLevel(stock: ReserveGroupe[]): StockLevel {
  const levels = stock.map((s) => stockLevel(s));
  if (levels.includes("critical")) return "critical";
  if (levels.includes("low")) return "low";
  return "ok";
}

/** Remplissage de la jauge, en pourcentage : le seuil d'alerte correspond à 50 %. */
export function fillPercent(s: ReserveGroupe): number {
  if (s.seuilAlerte <= 0) return 100;
  return Math.max(4, Math.min(100, Math.round((s.quantitePoches / (s.seuilAlerte * 2)) * 100)));
}
