import { ExecutiveDashboardData } from "@/types/dashboard";

// Données simulées — structure identique à la future réponse
// GET /api/dashboard/executif/?from=...&to=...
export const mockExecutiveDashboard: ExecutiveDashboardData = {
  period: {
    from: "2026-05-01",
    to: "2026-05-06",
  },
  kpis: [
    {
      id: "supports-recenses",
      label: "Supports recensés",
      value: 1375,
      trend: { value: 8.2, direction: "up", comparedTo: "vs période précédente" },
    },
    {
      id: "fiscalite-estimee",
      label: "Fiscalité estimée",
      value: 14106000,
      unit: "FCFA",
      trend: { value: 12.4, direction: "up", comparedTo: "vs période précédente" },
    },
    {
      id: "montant-reclame",
      label: "Montant réclamé",
      value: 144000000,
      unit: "FCFA",
      trend: { value: 9.7, direction: "up", comparedTo: "vs période précédente" },
    },
    {
      id: "gap-potentiel",
      label: "Gap potentiel",
      value: 37500000,
      unit: "FCFA",
      trend: { value: 15.3, direction: "up", comparedTo: "vs période précédente" },
    },
    {
      id: "communes-couvertes",
      label: "Communes couvertes",
      value: 18,
      trend: { value: 2, direction: "up", comparedTo: "vs période précédente" },
    },
    {
      id: "economies-suivies",
      label: "Économies suivies",
      value: 43000000,
      unit: "FCFA",
      trend: { value: 11.8, direction: "up", comparedTo: "vs période précédente" },
    },
  ],
  topCommunesCosts: [
    { commune: "Plateau", montantReclame: 52400000 },
    { commune: "Cocody", montantReclame: 34800000 },
    { commune: "Adjamé", montantReclame: 19600000 },
    { commune: "Marcory", montantReclame: 13200000 },
    { commune: "Abobo", montantReclame: 10100000 },
  ],
  supportStatus: [
    { label: "Bons", count: 1352, percentage: 98.3, color: "#0E4F66" },
    { label: "Défraichis", count: 18, percentage: 1.3, color: "#22B3C7" },
    { label: "Détériorés", count: 5, percentage: 0.4, color: "#E0533D" },
  ],
  decisionSuggestion: {
    text: "Prioriser le traitement des écarts fiscaux dans les communes de Plateau et Cocody qui concentrent 60% du montant réclamé. Lancer une mission de vérification ciblée à Adjamé pour valider les 23 supports signalés et confirmer la mise à jour de la grille fiscale dans 5 communes afin de sécuriser le potentiel de recettes.",
    ctaLabel: "Voir plan d'actions",
  },
  priorityAlerts: [
    {
      id: "alert-1",
      title: "Ordre de recettes Plateau à analyser",
      description: "Écart entre montant réclamé et fiscalité estimée",
      timeAgo: "Il y a 15 min",
      severity: "Élevée",
    },
    {
      id: "alert-2",
      title: "Écart élevé Adjamé",
      description: "Gap potentiel supérieur à 20%",
      timeAgo: "Il y a 45 min",
      severity: "Élevée",
    },
    {
      id: "alert-3",
      title: "23 supports à vérifier",
      description: "Supports signalés avec anomalies",
      timeAgo: "Il y a 1 h",
      severity: "Moyenne",
    },
    {
      id: "alert-4",
      title: "Renouvellement de grille fiscale à confirmer",
      description: "Mise à jour requise pour 5 communes",
      timeAgo: "Il y a 2 h",
      severity: "Faible",
    },
  ],
  recentActivity: [
    {
      id: "act-1",
      description: "Nouvel ordre de recettes enregistré – Commune de Cocody",
      timeAgo: "Il y a 10 min",
      type: "success",
    },
    {
      id: "act-2",
      description: "18 nouveaux supports ajoutés par les agents",
      timeAgo: "Il y a 35 min",
      type: "info",
    },
    {
      id: "act-3",
      description: "Écart fiscal détecté – Commune de Marcory",
      timeAgo: "Il y a 1 h",
      type: "warning",
    },
  ],
};

