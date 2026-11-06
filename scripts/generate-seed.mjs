#!/usr/bin/env node
// Générateur des données de test BloodLink / Idammen (SCRUM-71).
//
// Un seul script produit :
//   - src/api/seed-data.json : données du mode mock du frontend
//   - seed/sql/*.sql          : scripts d'insertion pour les bases PostgreSQL du backend
//
// Usage : npm run seed            (600 donneurs)
//         npm run seed -- 2000    (nombre de donneurs au choix, 500 à 2000)
//
// Toutes les personnes sont fictives : noms tirés au hasard, e-mails en @example.ma,
// numéros de téléphone aléatoires. Les valeurs médicales (délais, proportions des groupes)
// sont des valeurs de référence à confirmer.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { faker } from "@faker-js/faker";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DONOR_COUNT = Math.min(2000, Math.max(500, Number(process.argv[2]) || 600));
const REFERENCE_DATE = new Date("2026-11-06T09:00:00Z");
const DAY = 24 * 3600 * 1000;

faker.seed(2026); // mêmes données à chaque exécution

// ---------------------------------------------------------------- référentiels

/** Proportions approximatives des groupes sanguins au Maroc (valeurs de référence). */
const GROUP_WEIGHTS = [
  { value: "O+", weight: 40 },
  { value: "A+", weight: 30 },
  { value: "B+", weight: 14 },
  { value: "AB+", weight: 4 },
  { value: "O-", weight: 5 },
  { value: "A-", weight: 4 },
  { value: "B-", weight: 2 },
  { value: "AB-", weight: 1 },
];
const GROUPS = GROUP_WEIGHTS.map((g) => g.value);

/** Délai minimum entre deux dons de sang total, en jours (valeurs de référence). */
const MIN_DAYS_BETWEEN_DONATIONS = { M: 60, F: 90 };

/** Seuil d'alerte de base par groupe, multiplié ensuite par la taille du centre. */
const BASE_THRESHOLD = {
  "O+": 30,
  "A+": 24,
  "B+": 14,
  "AB+": 6,
  "O-": 12,
  "A-": 8,
  "B-": 6,
  "AB-": 4,
};

/** Centres de transfusion. Coordonnées : centre-ville. Adresses à vérifier avant usage public. */
const CENTERS = [
  {
    nom: "Centre Régional de Transfusion Sanguine de Casablanca",
    ville: "Casablanca",
    region: "Casablanca-Settat",
    adresse: "Quartier des Hôpitaux, Casablanca",
    latitude: 33.5779,
    longitude: -7.6185,
    taille: 1.6,
  },
  {
    nom: "Centre National de Transfusion Sanguine et d'Hématologie",
    ville: "Rabat",
    region: "Rabat-Salé-Kénitra",
    adresse: "Souissi, Rabat",
    latitude: 33.9846,
    longitude: -6.8518,
    taille: 1.5,
  },
  {
    nom: "Centre Régional de Transfusion Sanguine de Fès",
    ville: "Fes",
    region: "Fès-Meknès",
    adresse: "Centre hospitalier, Fès",
    latitude: 34.0181,
    longitude: -5.0078,
    taille: 1.0,
  },
  {
    nom: "Centre Régional de Transfusion Sanguine de Marrakech",
    ville: "Marrakech",
    region: "Marrakech-Safi",
    adresse: "Centre hospitalier, Marrakech",
    latitude: 31.6346,
    longitude: -8.0083,
    taille: 1.1,
  },
  {
    nom: "Centre Régional de Transfusion Sanguine de Tanger",
    ville: "Tanger",
    region: "Tanger-Tétouan-Al Hoceïma",
    adresse: "Centre hospitalier, Tanger",
    latitude: 35.7673,
    longitude: -5.7998,
    taille: 0.9,
  },
  {
    nom: "Centre Régional de Transfusion Sanguine d'Agadir",
    ville: "Agadir",
    region: "Souss-Massa",
    adresse: "Centre hospitalier, Agadir",
    latitude: 30.4202,
    longitude: -9.5982,
    taille: 0.8,
  },
  {
    nom: "Centre Régional de Transfusion Sanguine d'Oujda",
    ville: "Oujda",
    region: "Oriental",
    adresse: "Centre hospitalier, Oujda",
    latitude: 34.6814,
    longitude: -1.9086,
    taille: 0.7,
  },
  {
    nom: "Centre Régional de Transfusion Sanguine de Meknès",
    ville: "Meknes",
    region: "Fès-Meknès",
    adresse: "Centre hospitalier, Meknès",
    latitude: 33.8935,
    longitude: -5.5473,
    taille: 0.7,
  },
].map((c, i) => ({ id: i + 1, telephone: fixedPhone(i), ...c }));

/** Répartition des donneurs : surtout autour de Casablanca et Rabat (critère SCRUM-71). */
const CITY_WEIGHTS = [
  { value: 1, weight: 40 },
  { value: 2, weight: 25 },
  { value: 3, weight: 8 },
  { value: 4, weight: 8 },
  { value: 5, weight: 6 },
  { value: 6, weight: 5 },
  { value: 7, weight: 4 },
  { value: 8, weight: 4 },
];

const FIRST_NAMES_M = [
  "Youssef",
  "Mohamed",
  "Ahmed",
  "Amine",
  "Hamza",
  "Omar",
  "Mehdi",
  "Anas",
  "Ayoub",
  "Karim",
  "Rachid",
  "Hassan",
  "Said",
  "Abdelilah",
  "Ismail",
  "Othmane",
  "Zakaria",
  "Soufiane",
  "Ilyas",
  "Adil",
  "Hicham",
  "Nabil",
  "Reda",
  "Badr",
  "Yassine",
  "Idriss",
  "Brahim",
  "Lahcen",
  "Mustapha",
  "Driss",
  "Aziz",
  "Jamal",
  "Tarik",
  "Walid",
  "Khalid",
];
const FIRST_NAMES_F = [
  "Fatima Zahra",
  "Khadija",
  "Salma",
  "Aya",
  "Imane",
  "Hajar",
  "Meryem",
  "Sara",
  "Nadia",
  "Siham",
  "Houda",
  "Zineb",
  "Loubna",
  "Asmae",
  "Hanane",
  "Ikram",
  "Wiam",
  "Chaimaa",
  "Kaoutar",
  "Soukaina",
  "Oumaima",
  "Nora",
  "Ghizlane",
  "Latifa",
  "Rajae",
  "Btissam",
  "Hind",
  "Amal",
  "Dounia",
  "Yasmine",
  "Rim",
  "Malak",
  "Najat",
  "Samira",
  "Tilila",
];
const LAST_NAMES = [
  "El Amrani",
  "Benali",
  "Bouzid",
  "El Idrissi",
  "Alaoui",
  "Bennani",
  "Tazi",
  "Berrada",
  "El Fassi",
  "Chraibi",
  "Lahlou",
  "Benjelloun",
  "Ouazzani",
  "Amrani",
  "El Mansouri",
  "Naciri",
  "Bakkali",
  "Haddad",
  "Belhaj",
  "Zahraoui",
  "Ait Taleb",
  "Ait Ouahmane",
  "Oubella",
  "Ouchen",
  "Amzil",
  "Akhannouch",
  "Boutaleb",
  "Kettani",
  "Squalli",
  "Sebti",
  "El Ouafi",
  "Moussaoui",
  "Rahmouni",
  "Saidi",
  "Jabri",
  "Lamrani",
  "Hilali",
  "Cherkaoui",
  "Filali",
  "Ziani",
  "Tahiri",
  "Sabri",
  "El Khatib",
  "Benkirane",
  "Karimi",
  "Daoudi",
  "Mernissi",
  "Bouhlal",
  "Ouardi",
  "Aouad",
];

// ---------------------------------------------------------------- utilitaires

function fixedPhone(i) {
  return `+212 5${22 + i} ${String(10 + i * 7).padStart(2, "0")} ${String(30 + i * 3).padStart(2, "0")} ${String(40 + i).padStart(2, "0")}`;
}
function mobile() {
  const d = () => faker.number.int({ min: 10, max: 99 });
  return `+212 6${faker.number.int({ min: 10, max: 99 })} ${d()} ${d()} ${d()}`;
}
function slug(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "");
}
function isoDay(d) {
  return d.toISOString().slice(0, 10);
}
/** Point aléatoire à moins de `km` kilomètres d'un centre-ville. */
function jitter(lat, lng, km) {
  const r = (km / 111) * Math.sqrt(faker.number.float({ min: 0, max: 1 }));
  const a = faker.number.float({ min: 0, max: 2 * Math.PI });
  return {
    latitude: Number((lat + r * Math.cos(a)).toFixed(5)),
    longitude: Number((lng + (r * Math.sin(a)) / Math.cos((lat * Math.PI) / 180)).toFixed(5)),
  };
}
function sqlString(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}
/** Nom de constante Java pour un groupe sanguin : A+ -> A_POSITIF (convention du request-service). */
function groupEnum(g) {
  return `${g.replace(/[+-]/, "")}_${g.endsWith("+") ? "POSITIF" : "NEGATIF"}`;
}

// ---------------------------------------------------------------- donneurs et dons

const donors = [];
const donations = [];
let donationId = 1;

for (let id = 1; id <= DONOR_COUNT; id++) {
  const sexe = id === 1 ? "M" : faker.helpers.arrayElement(["M", "F"]);
  const prenom =
    id === 1 ? "Youssef" : faker.helpers.arrayElement(sexe === "M" ? FIRST_NAMES_M : FIRST_NAMES_F);
  const nomFamille = id === 1 ? "El Amrani" : faker.helpers.arrayElement(LAST_NAMES);
  const centreId = id === 1 ? 1 : faker.helpers.weightedArrayElement(CITY_WEIGHTS);
  const centre = CENTERS[centreId - 1];
  const position =
    id === 1
      ? { latitude: 33.5831, longitude: -7.5998 }
      : jitter(centre.latitude, centre.longitude, 12);
  const birth =
    id === 1
      ? new Date("1995-04-17")
      : faker.date.birthdate({ mode: "age", min: 18, max: 64, refDate: REFERENCE_DATE });

  // Historique : 0 à 6 dons sur 24 mois, en respectant le délai minimum entre deux dons.
  const count =
    id === 1
      ? 5
      : faker.helpers.weightedArrayElement([
          { value: 0, weight: 18 },
          { value: 1, weight: 26 },
          { value: 2, weight: 22 },
          { value: 3, weight: 15 },
          { value: 4, weight: 10 },
          { value: 5, weight: 6 },
          { value: 6, weight: 3 },
        ]);
  const minGap = MIN_DAYS_BETWEEN_DONATIONS[sexe];
  const dates = [];
  let cursor = REFERENCE_DATE.getTime() - faker.number.int({ min: 5, max: 200 }) * DAY;
  if (id === 1) cursor = REFERENCE_DATE.getTime() - 147 * DAY; // dernier don il y a ~5 mois : éligible
  for (let k = 0; k < count; k++) {
    dates.push(new Date(cursor));
    cursor -= (minGap + faker.number.int({ min: 0, max: 120 })) * DAY;
  }
  for (const d of dates.reverse()) {
    donations.push({
      id: donationId++,
      donneurId: id,
      centreId,
      demandeId: 0,
      quantite: 1,
      datePrelevement: isoDay(d),
      statut: "VALIDE",
    });
  }

  donors.push({
    id,
    nom: `${prenom} ${nomFamille}`,
    email: id === 1 ? "youssef@example.ma" : `${slug(prenom)}.${slug(nomFamille)}${id}@example.ma`,
    telephone: id === 1 ? "+212 612 34 56 78" : mobile(),
    sexe,
    groupeSanguin: id === 1 ? "O+" : faker.helpers.weightedArrayElement(GROUP_WEIGHTS),
    dateNaissance: isoDay(birth),
    poids: id === 1 ? 74 : faker.number.int({ min: 50, max: 105 }),
    ville: centre.ville,
    centreId,
    ...position,
    dateDernierDon: dates.length ? isoDay(dates[dates.length - 1]) : null,
  });
}

// ---------------------------------------------------------------- stock, demandes, réponses

const stock = [];
let stockId = 1;
for (const c of CENTERS) {
  for (const g of GROUPS) {
    const seuilAlerte = Math.max(2, Math.round(BASE_THRESHOLD[g] * c.taille));
    // Entre 25 % et 260 % du seuil : certains groupes passent sous le seuil, comme dans la réalité.
    const ratio = faker.number.float({ min: 0.25, max: 2.6 });
    stock.push({
      id: stockId++,
      centreId: c.id,
      groupeSanguin: g,
      quantitePoches: Math.round(seuilAlerte * ratio),
      seuilAlerte,
    });
  }
}

const requests = [];
const responses = [];
let requestId = 1;
let plannedDonationId = 100000;
const COMPATIBLE_DONORS = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": GROUPS,
};

for (const c of CENTERS) {
  const low = stock.filter((s) => s.centreId === c.id && s.quantitePoches <= s.seuilAlerte);
  // Une demande active par groupe sous le seuil (au plus 3), plus deux demandes passées.
  const active = low.slice(0, 3).map((s) => ({
    groupe: s.groupeSanguin,
    urgence: s.quantitePoches <= s.seuilAlerte / 2 ? "CRITIQUE" : "URGENTE",
    quantite: Math.max(2, s.seuilAlerte - s.quantitePoches),
    creeIlYaHeures: faker.number.int({ min: 2, max: 60 }),
    expireDansHeures: faker.number.int({ min: 24, max: 120 }),
    statut: "ACTIVE",
  }));
  const past = [0, 1].map(() => ({
    groupe: faker.helpers.weightedArrayElement(GROUP_WEIGHTS),
    urgence: faker.helpers.arrayElement(["NORMALE", "URGENTE"]),
    quantite: faker.number.int({ min: 3, max: 15 }),
    creeIlYaHeures: faker.number.int({ min: 24 * 15, max: 24 * 90 }),
    expireDansHeures: -faker.number.int({ min: 24 * 10, max: 24 * 80 }),
    statut: "EXPIREE",
  }));
  for (const r of [...active, ...past]) {
    const id = requestId++;
    requests.push({
      id,
      centreId: c.id,
      groupeSanguinDemande: r.groupe,
      quantiteNecessaire: r.quantite,
      urgence: r.urgence,
      statut: r.statut,
      creeIlYaHeures: r.creeIlYaHeures,
      expireDansHeures: r.expireDansHeures,
    });
    if (r.statut !== "ACTIVE") continue;
    // Donneurs notifiés : compatibles, du même centre, éligibles (le matching ne garde que ceux-là).
    const candidates = donors.filter(
      (d) =>
        d.centreId === c.id &&
        COMPATIBLE_DONORS[r.groupe].includes(d.groupeSanguin) &&
        isEligible(d, REFERENCE_DATE),
    );
    for (const d of faker.helpers.arrayElements(
      candidates,
      Math.min(candidates.length, faker.number.int({ min: 4, max: 10 })),
    )) {
      if (d.id === 1) continue; // le donneur de démo répond lui-même depuis son espace
      const reponse = faker.helpers.weightedArrayElement([
        { value: "CONFIRME", weight: 45 },
        { value: "DECLINE", weight: 25 },
        { value: "SANS_REPONSE", weight: 30 },
      ]);
      responses.push({ demandeId: id, donneurId: d.id, reponse, donId: plannedDonationId++ });
    }
  }
}

function isEligible(d, now) {
  if (!d.dateDernierDon) return true;
  return (
    now.getTime() - new Date(d.dateDernierDon).getTime() >= MIN_DAYS_BETWEEN_DONATIONS[d.sexe] * DAY
  );
}

// ---------------------------------------------------------------- fidélité

/** Niveaux de fidélité : seuils de points (valeurs de référence à confirmer). */
const LEVELS = [
  { niveau: "Bronze", min: 0 },
  { niveau: "Argent", min: 200 },
  { niveau: "Or", min: 500 },
  { niveau: "Platine", min: 1000 },
];
// Le niveau dépend des points cumulés (100 par don) ; les points disponibles baissent après un échange.
const points = donors.map((d) => {
  const dons = donations.filter((x) => x.donneurId === d.id).length;
  const cumules = dons * 100;
  const niveau = [...LEVELS].reverse().find((l) => cumules >= l.min).niveau;
  const depenses = d.id === 1 ? 150 : 0; // le donneur de démo a déjà échangé une récompense
  return {
    donneurId: d.id,
    pointsCumules: cumules,
    pointsActuels: cumules - depenses,
    nombreDonsTotal: dons,
    niveau,
  };
});

// ---------------------------------------------------------------- écriture

const data = {
  generatedAt: REFERENCE_DATE.toISOString(),
  centers: CENTERS.map(({ taille, ...c }) => c),
  donors,
  donations,
  stock,
  requests,
  responses,
  points,
  levels: LEVELS,
};
writeFileSync(join(root, "src/api/seed-data.json"), JSON.stringify(data));

const sqlDir = join(root, "seed/sql");
mkdirSync(sqlDir, { recursive: true });
const header = (service) =>
  `-- Données de test BloodLink (SCRUM-71) — ${service}\n-- Générées par scripts/generate-seed.mjs : ne pas modifier à la main.\n-- Noms de tables et de colonnes : convention Spring/JPA par défaut (snake_case), à aligner sur vos entités.\n\n`;
const insert = (table, rows) =>
  rows.length
    ? `INSERT INTO ${table} (${Object.keys(rows[0]).join(", ")}) VALUES\n${rows.map((r) => `  (${Object.values(r).map(sqlString).join(", ")})`).join(",\n")};\n\n`
    : "";

writeFileSync(
  join(sqlDir, "donor-service.sql"),
  header("donor-service") +
    insert(
      "donneur",
      donors.map((d) => ({
        id: d.id,
        nom: d.nom,
        email: d.email,
        telephone: d.telephone,
        sexe: d.sexe,
        groupe_sanguin: groupEnum(d.groupeSanguin),
        date_naissance: d.dateNaissance,
        poids: d.poids,
        latitude: d.latitude,
        longitude: d.longitude,
        date_dernier_don: d.dateDernierDon,
        statut_eligibilite: isEligible(d, REFERENCE_DATE) ? "ELIGIBLE" : "NON_ELIGIBLE",
      })),
    ),
);
writeFileSync(
  join(sqlDir, "center-service.sql"),
  header("center-service") +
    insert(
      "centre",
      CENTERS.map((c) => ({
        id: c.id,
        nom: c.nom,
        adresse: c.adresse,
        latitude: c.latitude,
        longitude: c.longitude,
        telephone: c.telephone,
      })),
    ) +
    insert(
      "stock_sang",
      stock.map((s) => ({
        id: s.id,
        centre_id: s.centreId,
        groupe_sanguin: groupEnum(s.groupeSanguin),
        quantite_poches: s.quantitePoches,
        seuil_alerte: s.seuilAlerte,
        date_maj: REFERENCE_DATE.toISOString(),
      })),
    ),
);
writeFileSync(
  join(sqlDir, "request-service.sql"),
  header("request-service") +
    insert(
      "demande_don",
      requests.map((r) => ({
        id: r.id,
        centre_id: r.centreId,
        groupe_sanguin: groupEnum(r.groupeSanguinDemande),
        quantite_requise: r.quantiteNecessaire,
        niveau_urgence: { NORMALE: "NORMAL", URGENTE: "ELEVE", CRITIQUE: "CRITIQUE" }[r.urgence],
        statut: r.statut,
        date_creation: new Date(REFERENCE_DATE.getTime() - r.creeIlYaHeures * 3600e3).toISOString(),
      })),
    ) +
    insert(
      "don",
      donations.map((d) => ({
        id: d.id,
        donneur_id: d.donneurId,
        centre_id: d.centreId,
        demande_id: null,
        quantite: d.quantite,
        date_prelevement: d.datePrelevement,
        statut: d.statut,
      })),
    ),
);
writeFileSync(
  join(sqlDir, "loyalty-service.sql"),
  header("loyalty-service") +
    insert(
      "points_donneur",
      points.map((p) => ({
        donneur_id: p.donneurId,
        points_actuels: p.pointsActuels,
        niveau: p.niveau.toUpperCase(),
        nombre_dons_total: p.nombreDonsTotal,
      })),
    ),
);

console.log(
  `${donors.length} donneurs, ${donations.length} dons, ${CENTERS.length} centres, ${stock.length} lignes de stock, ${requests.length} demandes, ${responses.length} réponses.`,
);
