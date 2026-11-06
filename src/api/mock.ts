// API simulée en mémoire (VITE_USE_MOCK). Les données viennent de seed-data.json,
// produit par scripts/generate-seed.mjs (SCRUM-71). Un rechargement de page remet tout à zéro.
import seed from "./seed-data.json";
import type {
  Centre,
  DemandeDon,
  Don,
  DonorResponse,
  Donneur,
  EchangeRecompense,
  PointsDonneur,
  Recompense,
  ReserveCentre,
  StockSang,
} from "./models";
import { decodeToken, readToken } from "./session";
import { distanceKm } from "@/lib/geo";

const DAY = 24 * 3600 * 1000;
const HOUR = 3600 * 1000;

/** Délai minimum entre deux dons, en jours (valeurs de référence à confirmer). */
export const MIN_DAYS_BETWEEN_DONATIONS: Record<string, number> = { M: 60, F: 90 };

/** Quels groupes peuvent donner à un receveur donné. */
export const COMPATIBLE_DONORS: Record<string, string[]> = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

/** Date à partir de laquelle un donneur peut de nouveau donner. */
export function nextEligibleDate(d: Pick<Donneur, "dateDernierDon" | "sexe">): Date {
  if (!d.dateDernierDon) return new Date(0);
  const gap = MIN_DAYS_BETWEEN_DONATIONS[d.sexe ?? "M"] ?? 60;
  return new Date(new Date(d.dateDernierDon).getTime() + gap * DAY);
}

const now = Date.now();

export const centers: Centre[] = seed.centers;
const center = centers[0] as Centre;

const donors: Donneur[] = seed.donors.map((d) => ({
  ...d,
  statutEligibilite: nextEligibleDate(d).getTime() <= now ? "ELIGIBLE" : "NON_ELIGIBLE",
}));
const donorById = new Map(donors.map((d) => [d.id, d]));
const centerById = new Map(centers.map((c) => [c.id, c]));
/** Every seeded row points to an existing center; fall back to the first one just in case. */
const centerOf = (id: number): Centre => centerById.get(id) ?? (centers[0] as Centre);

const donor = donors[0] as Donneur;

const requests: DemandeDon[] = seed.requests.map((r) => ({
  id: r.id,
  centreId: r.centreId,
  groupeSanguinDemande: r.groupeSanguinDemande,
  quantiteNecessaire: r.quantiteNecessaire,
  urgence: r.urgence,
  statut: r.statut,
  dateCreation: new Date(now - r.creeIlYaHeures * HOUR).toISOString(),
  dateExpiration: new Date(now + r.expireDansHeures * HOUR).toISOString(),
  centre: centerOf(r.centreId),
}));

const responses: DonorResponse[] = seed.responses.flatMap((r) => {
  const d = donorById.get(r.donneurId);
  const request = requests.find((x) => x.id === r.demandeId);
  if (!d || !request) return [];
  return [
    {
      donneur: d,
      reponse: r.reponse,
      don: {
        id: r.donId,
        donneurId: d.id,
        centreId: request.centreId,
        demandeId: request.id,
        quantite: 1,
        datePrelevement: request.dateCreation,
        statut: "PLANIFIE",
      },
    },
  ];
});

const seedPoints = seed.points[0] as (typeof seed.points)[number];

export const mockDb = {
  donor,
  center,
  donors,
  centers,
  /** Stock de tous les centres ; le centre connecté ne voit que le sien. */
  allStock: seed.stock.map((s) => ({
    ...s,
    dateMAJ: new Date(now - (s.id % 9) * HOUR).toISOString(),
  })) as StockSang[],
  get stock(): StockSang[] {
    return this.allStock.filter((s) => s.centreId === center.id);
  },
  requests,
  donations: seed.donations.map((d) => ({ ...d, centre: centerOf(d.centreId) })) as Don[],
  responses,
  levels: seed.levels,
  points: {
    id: 1,
    donneurId: 1,
    pointsActuels: seedPoints.pointsActuels,
    niveau: seedPoints.niveau,
    nombreDonsTotal: seedPoints.nombreDonsTotal,
  } as PointsDonneur,
  pointsCumules: seedPoints.pointsCumules,
  rewards: [
    {
      id: 1,
      nom: "Bilan santé",
      description: "",
      coutPoints: 250,
      type: "SANTE",
      stockDisponible: 8,
      translationKey: "reward1",
    },
    {
      id: 2,
      nom: "Bon librairie",
      description: "",
      coutPoints: 150,
      type: "BON",
      stockDisponible: 12,
      translationKey: "reward2",
    },
    {
      id: 3,
      nom: "Certificat solidaire",
      description: "",
      coutPoints: 100,
      type: "CERTIFICAT",
      stockDisponible: 50,
      translationKey: "reward3",
    },
  ] as Recompense[],
  exchanges: [] as EchangeRecompense[],
};

export function requireMockRole(role: "DONNEUR" | "CENTRE") {
  const token = readToken();
  const claims = token ? decodeToken(token) : null;
  if (claims?.role !== role) throw new Error("error");
}

/** Points, niveau et progression vers le niveau suivant. */
export function mockPoints(): PointsDonneur {
  const levels = mockDb.levels;
  const index = levels.findIndex((l) => l.niveau === mockDb.points.niveau);
  const current = levels[index];
  const next = levels[index + 1];
  if (!current || !next) return { ...mockDb.points, progression: 100 };
  const progression = Math.round(
    ((mockDb.pointsCumules - current.min) / (next.min - current.min)) * 100,
  );
  return {
    ...mockDb.points,
    progression: Math.min(100, Math.max(0, progression)),
    prochainNiveau: next.niveau,
    pointsProchainNiveau: Math.max(0, next.min - mockDb.pointsCumules),
  };
}

/** Alertes du donneur : demandes actives compatibles avec son groupe, dans un rayon de 60 km. */
export function mockAlerts(): DemandeDon[] {
  return mockDb.requests.filter((r) => {
    const c = centerById.get(r.centreId);
    return (
      r.statut === "ACTIVE" &&
      (COMPATIBLE_DONORS[r.groupeSanguinDemande] ?? []).includes(mockDb.donor.groupeSanguin) &&
      !!c &&
      distanceKm(c, mockDb.donor) <= 60
    );
  });
}

/** Donneurs proches du centre connecté (rayon de 15 km). */
export function mockNearbyDonors(): Donneur[] {
  return mockDb.donors.filter((d) => distanceKm(d, center) <= 15);
}

/** Nombre de dons validés par mois pour le centre connecté, sur les 6 derniers mois complets. */
export function mockMonthlyDonations() {
  const result: { month: number; dons: number }[] = [];
  const today = new Date();
  for (let k = 6; k >= 1; k--) {
    const first = new Date(today.getFullYear(), today.getMonth() - k, 1);
    const last = new Date(today.getFullYear(), today.getMonth() - k + 1, 1);
    const dons = mockDb.donations.filter((d) => {
      const t = new Date(d.datePrelevement).getTime();
      return (
        d.centreId === center.id &&
        d.statut === "VALIDE" &&
        t >= first.getTime() &&
        t < last.getTime()
      );
    }).length;
    result.push({ month: first.getMonth() + 1, dons });
  }
  return result;
}

/** Réserves publiques de chaque centre, sans aucune donnée personnelle. */
export function mockReserves(): ReserveCentre[] {
  return centers.map((c) => ({
    centre: c,
    stock: mockDb.allStock
      .filter((s) => s.centreId === c.id)
      .map(({ groupeSanguin, quantitePoches, seuilAlerte }) => ({
        groupeSanguin,
        quantitePoches,
        seuilAlerte,
      })),
  }));
}

export function validateMockDonation(id: number) {
  requireMockRole("CENTRE");
  const row = mockDb.responses.find((r) => r.don.id === id);
  if (!row || row.reponse !== "CONFIRME" || row.don.statut === "VALIDE") throw new Error("error");
  row.don.statut = "VALIDE";
  row.don.datePrelevement = new Date().toISOString();
  mockDb.donations.push({ ...row.don, centre: centerOf(row.don.centreId) });
  const stock = mockDb.allStock.find(
    (s) => s.centreId === row.don.centreId && s.groupeSanguin === row.donneur.groupeSanguin,
  );
  if (stock) {
    stock.quantitePoches += row.don.quantite;
    stock.dateMAJ = new Date().toISOString();
  }
  // Le donneur ne redevient éligible qu'après le délai légal.
  row.donneur.dateDernierDon = new Date().toISOString().slice(0, 10);
  row.donneur.statutEligibilite = "NON_ELIGIBLE";
  return row.don;
}

export function exchangeMockReward(id: number) {
  requireMockRole("DONNEUR");
  const reward = mockDb.rewards.find((r) => r.id === id);
  if (!reward || reward.stockDisponible < 1 || mockDb.points.pointsActuels < reward.coutPoints)
    throw new Error("error");
  mockDb.points.pointsActuels -= reward.coutPoints;
  reward.stockDisponible -= 1;
  const exchange: EchangeRecompense = {
    id: mockDb.exchanges.length + 1,
    donneurId: 1,
    recompenseId: id,
    dateEchange: new Date().toISOString(),
    statut: "DISPONIBLE",
    codeUtilisation: `IDA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  };
  mockDb.exchanges.push(exchange);
  return exchange;
}
