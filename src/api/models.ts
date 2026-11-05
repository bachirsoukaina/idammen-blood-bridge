export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type Role = "DONNEUR" | "CENTRE" | "ADMIN";
export interface Donneur {
  id: number;
  nom: string;
  email: string;
  telephone: string;
  groupeSanguin: string;
  dateNaissance: string;
  poids: number;
  latitude: number;
  longitude: number;
  dateDernierDon: string | null;
  statutEligibilite: string;
}
export interface Centre {
  id: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  telephone: string;
}
export interface StockSang {
  id: number;
  centreId: number;
  groupeSanguin: string;
  quantitePoches: number;
  seuilAlerte: number;
  dateMAJ: string;
}
export interface DemandeDon {
  id: number;
  centreId: number;
  groupeSanguinDemande: string;
  quantiteNecessaire: number;
  urgence: string;
  statut: string;
  dateCreation: string;
  dateExpiration: string;
  centre?: Centre;
  reponse?: string;
}
export interface Don {
  id: number;
  donneurId: number;
  centreId: number;
  demandeId: number;
  quantite: number;
  datePrelevement: string;
  statut: string;
  centre?: Centre;
}
export interface PointsDonneur {
  id: number;
  donneurId: number;
  pointsActuels: number;
  niveau: string;
  nombreDonsTotal: number;
  progression?: number;
  prochainNiveau?: string;
  pointsProchainNiveau?: number;
}
export interface Recompense {
  id: number;
  nom: string;
  description: string;
  coutPoints: number;
  type: string;
  stockDisponible: number;
  translationKey?: string;
}
export interface EchangeRecompense {
  id: number;
  donneurId: number;
  recompenseId: number;
  dateEchange: string;
  statut: string;
  codeUtilisation: string;
}
export interface DonorResponse {
  donneur: Donneur;
  reponse: string;
  don: Don;
}
export interface Eligibility {
  eligible: boolean;
  dateEligibilite: string;
}
export const cities = [
  { key: "Casablanca", latitude: 33.5731, longitude: -7.5898 },
  { key: "Rabat", latitude: 34.0209, longitude: -6.8416 },
  { key: "Marrakech", latitude: 31.6295, longitude: -7.9811 },
  { key: "Fes", latitude: 34.0331, longitude: -5.0003 },
  { key: "Tanger", latitude: 35.7595, longitude: -5.834 },
  { key: "Agadir", latitude: 30.4278, longitude: -9.5981 },
];
