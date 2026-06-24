// Types partagés pour les dashboards.
// Ces formes correspondent à ce que renverra l'API DRF plus tard.

export interface KpiCard {
  id: string;
  label: string;
  value: number;
  unit?: string;
  trend: {
    value: number; // ex: 8.2 pour +8.2%
    direction: "up" | "down";
    comparedTo: string; // ex: "vs période précédente"
  };
}

export interface CommuneCost {
  commune: string;
  montantReclame: number; // FCFA
}

export interface SupportStatusBreakdown {
  label: "Bons" | "Défraichis" | "Détériorés";
  count: number;
  percentage: number;
  color: string;
}

export type AlertSeverity = "Élevée" | "Moyenne" | "Faible";

export interface PriorityAlert {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  severity: AlertSeverity;
}

export interface ActivityItem {
  id: string;
  description: string;
  timeAgo: string;
  type: "success" | "info" | "warning";
}

export interface ExecutiveDashboardData {
  period: {
    from: string; // ISO date
    to: string;
  };
  kpis: KpiCard[];
  topCommunesCosts: CommuneCost[];
  supportStatus: SupportStatusBreakdown[];
  decisionSuggestion: {
    text: string;
    ctaLabel: string;
  };
  priorityAlerts: PriorityAlert[];
  recentActivity: ActivityItem[];
}

// --- Tableau de bord : Négociations & Économies -----------------------------

export type ActionType = "reunion" | "argumentaire" | "relance";

export interface NegotiationFile {
  id: string;
  commune: string;
  montantInitial: number;
  montantRecalcule: number;
  montantNegocie: number;
  economie: number;
  nextAction: {
    type: ActionType;
    label: string; // ex: "Réunion - 09/05/2026"
  };
}

export interface OngoingFile {
  id: string;
  commune: string;
  nextAppointment: string; // ex: "Prochain RDV : 09/05/2026 à 10:00"
  tag: {
    label: "Réunion" | "Argumentaire";
    color: "blue" | "orange";
  };
}

export interface ReadyArgument {
  id: string;
  label: string;
  count: number;
  iconKey: "absent" | "doublon" | "periode" | "surface";
}

export interface MonthlySaving {
  month: string;
  amount: number; // FCFA
}

export interface NegotiationsDashboardData {
  period: { from: string; to: string };
  kpis: KpiCard[];
  negotiationFiles: NegotiationFile[];
  ongoingFiles: OngoingFile[];
  readyArguments: ReadyArgument[];
  monthlySavings: MonthlySaving[];
  performance: {
    averageReductionPercent: number;
    totalSavingsAmount: number;
  };
}

// --- Supports publicitaires ---------------------------------------------

export type EtatSupport = "Bon" | "Défraichi" | "Détérioré";
export type Visibilite = "Excellente" | "Bonne" | "Moyenne" | "Faible";
export type Canal = "Affichage" | "Bâche" | "Panneau lumineux" | "Totem" | "Vitrine";

export interface SupportPublicitaire {
  id: string;
  // Identification
  marque: string;
  entreprise: string;
  agent: string;
  // Localisation
  ville: string;
  commune: string;
  region: string;
  district: string;
  village: string;
  quartier: string;
  nomSite: string;
  latitude: number | null;
  longitude: number | null;
  // Caractéristiques techniques
  typeSupport: string;
  surface: number | null;
  nombreSupport: number | null;
  nombreFace: number | null;
  surfaceODP: number | null;
  canal: Canal;
  etatSupport: EtatSupport;
  typeSite: string;
  visibilite: Visibilite;
  // Description
  description: string;
  observation: string;
  // Responsable terrain
  responsableNom: string;
  responsablePrenom: string;
  responsableContact: string;
  // Signataire
  signataireNom: string;
  signatairePrenom: string;
  signataireContact: string;
  // Fiscalité / taxes
  duree: number | null;
  anciennete: boolean;
  tsp: number | null; // Taxe sur support publicitaire
  odp: boolean; // Occupation domaine public
  odpValue: number | null;
  ap: boolean; // Autorisation publicité
  apa: boolean;
  apt: boolean;
  ae: boolean; // Autorisation enseigne
  aea: boolean;
  aet: boolean;
  tauxCommune: boolean;
  tauxRegion: boolean;
  tauxDistrict: boolean;
  // Médias
  imageSupport: string | null;
  imageSupportSecondaire: string | null;
  // Métadonnées
  dateCollecte: string; // ISO
  updatedAt: string; // ISO
  isDeleted: boolean;
}

export interface SupportsFilters {
  search: string;
  commune: string | "Toutes";
  typeSupport: string | "Tous";
  etatSupport: EtatSupport | "Tous";
  visibilite: Visibilite | "Toutes";
  canal: Canal | "Tous";
  agent: string | "Tous";
  dateFrom: string | null;
  dateTo: string | null;
}