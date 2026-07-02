"use client";

import type { ElementType } from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Map,
  LineChart as LineChartIcon,
  Receipt,
  FileBarChart,
  Users,
  Settings,
  ShieldCheck,
  Bell,
  ChevronDown,
  Calendar,
  SlidersHorizontal,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  AlertCircle,
  Boxes,
  Wallet,
  HandCoins,
  MapPinned,
  Coins,
  TrendingUp,
  TrendingDown,
  LogOut,
  Loader2,
  X,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { fetchDashboardExecutif } from "@/lib/api/dashboard";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ExecutiveDashboardData, AlertSeverity, ActivityItem } from "@/types/dashboard";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://backend360.onrender.com";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Entreprise {
  id: number;
  nom: string;
  sigle: string;
  logo: string | null;
}

interface FiltresDisponibles {
  communes: string[];
  typesSupport: string[];
  etatsSupport: string[];
}

interface SupportItem {
  id: number;
  etatSupport: string;
  typeSupport: string;
  commune: string;
  tsp: number | null;
  odpValue: number | null;
  odp: boolean;
  surface: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nDaysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function logoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}

function severityBadgeClasses(severity: AlertSeverity): string {
  switch (severity) {
    case "Élevée": return "bg-red-100 text-red-700";
    case "Moyenne": return "bg-amber-100 text-amber-700";
    case "Faible": return "bg-emerald-100 text-emerald-700";
  }
}

function severityIconClasses(severity: AlertSeverity): string {
  switch (severity) {
    case "Élevée": return "bg-red-50 text-red-500";
    case "Moyenne": return "bg-amber-50 text-amber-500";
    case "Faible": return "bg-emerald-50 text-emerald-500";
  }
}

function activityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "success": return <CheckCircle2 className="h-4 w-4" />;
    case "info": return <PlusCircle className="h-4 w-4" />;
    case "warning": return <AlertCircle className="h-4 w-4" />;
  }
}

function activityIconClasses(type: ActivityItem["type"]): string {
  switch (type) {
    case "success": return "bg-emerald-50 text-emerald-500";
    case "info": return "bg-blue-50 text-blue-500";
    case "warning": return "bg-amber-50 text-amber-500";
  }
}

const DONUT_COLORS: Record<string, string> = {
  Bon: "#10B981",
  Défraichi: "#F59E0B",
  Détérioré: "#EF4444",
};

const KPI_STYLES: Record<string, { icon: ElementType; badge: string }> = {
  "supports-recenses": { icon: Boxes, badge: "bg-violet-500" },
  "fiscalite-estimee": { icon: Wallet, badge: "bg-cyan-500" },
  "montant-reclame": { icon: HandCoins, badge: "bg-emerald-500" },
  "gap-potentiel": { icon: AlertTriangle, badge: "bg-orange-500" },
  "communes-couvertes": { icon: MapPinned, badge: "bg-blue-500" },
  "economies-suivies": { icon: Coins, badge: "bg-pink-500" },
};

const PERIODES = [
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "3 mois", days: 90 },
  { label: "1 an", days: 365 },
];

// ---------------------------------------------------------------------------
// Composant Logo entreprise
// ---------------------------------------------------------------------------

function EntrepriseLogo({
  entreprise,
  size = "md",
}: {
  entreprise: Entreprise | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-8 w-8 text-[11px]",
    lg: "h-10 w-10 text-sm",
  };
  const url = entreprise?.logo ? logoUrl(entreprise.logo) : null;
  const fallback = (
    entreprise?.sigle?.slice(0, 3) ||
    entreprise?.nom?.slice(0, 2) ||
    "?"
  ).toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={entreprise?.nom ?? "Logo"}
        className={`${sizeClasses[size]} shrink-0 rounded-full object-cover border border-slate-200`}
      />
    );
  }
  return (
    <div className={`${sizeClasses[size]} shrink-0 flex items-center justify-center rounded-full bg-amber-400 font-bold text-white`}>
      {fallback}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const NAV_SECTIONS = [
  {
    label: "Principal",
    items: [
      { label: "Vue Direction", href: "/dashboard-executif", icon: ShieldCheck },
      { label: "Tableau de bord", href: "/tableau-de-bord", icon: LayoutDashboard },
    ],
  },
  {
    label: "Opérations",
    items: [
      { label: "Supports publicitaires", href: "/supports-publicitaires", icon: ImageIcon },
      { label: "Carte des supports", href: "/carte-des-supports", icon: Map },
      { label: "Analyse fiscale", href: "/analyse-fiscale", icon: LineChartIcon },
      { label: "Ordres de recettes", href: "/ordres-de-recettes", icon: Receipt },
      { label: "Rapports & exports", href: "/rapports-exports", icon: FileBarChart },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Agents recenseurs", href: "/agents-recenseurs", icon: Users },
      { label: "Paramètres", href: "/parametres", icon: Settings },
      { label: "Administration", href: "/administration", icon: ShieldCheck },
    ],
  },
];

const ACTIVE_HREF = "/dashboard-executif";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardExecutifPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [filtresDisponibles, setFiltresDisponibles] = useState<FiltresDisponibles | null>(null);

  // Supports bruts pour les calculs TSP/ODP
  const [supports, setSupports] = useState<SupportItem[]>([]);
  const [supportsLoading, setSupportsLoading] = useState(true);

  // Période
  const [periodFrom, setPeriodFrom] = useState(nDaysAgoISO(7));
  const [periodTo, setPeriodTo] = useState(todayISO());
  const [periodPreset, setPeriodPreset] = useState<number | null>(7);

  // Filtres
  const [showFilters, setShowFilters] = useState(false);
  const [filterCommune, setFilterCommune] = useState("");
  const [filterTypeSupport, setFilterTypeSupport] = useState("");
  const [filterEtatSupport, setFilterEtatSupport] = useState("");

  const hasActiveFilters = !!(filterCommune || filterTypeSupport || filterEtatSupport);
  const activeFilterCount = [filterCommune, filterTypeSupport, filterEtatSupport].filter(Boolean).length;

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  // Logo entreprise
  useEffect(() => {
    if (!user?.entreprise) return;
    apiFetch<Entreprise>(`/api/entreprises/${user.entreprise}/`)
      .then(setEntreprise)
      .catch(() => {});
  }, [user]);

  // Filtres disponibles
  useEffect(() => {
    if (!user) return;
    apiFetch<FiltresDisponibles>("/api/supports/filtres-disponibles/")
      .then(setFiltresDisponibles)
      .catch(() => {});
  }, [user]);

  // Supports bruts — CORRECTION ODP : on somme odpValue directement
  // sans se fier au booléen odp qui peut être false même si odpValue > 0
  useEffect(() => {
    if (!user) return;
    setSupportsLoading(true);
    apiFetch<{ results?: SupportItem[] } | SupportItem[]>("/api/supports/")
      .then((res) => {
        const list: SupportItem[] = Array.isArray(res)
          ? res
          : (res as { results: SupportItem[] }).results ?? [];
        setSupports(list);
      })
      .catch(() => {})
      .finally(() => setSupportsLoading(false));
  }, [user]);

  // Dashboard agrégé
  const loadDashboard = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    fetchDashboardExecutif(periodFrom, periodTo)
      .then(setData)
      .catch(() => setError("Impossible de charger le dashboard."))
      .finally(() => setIsLoading(false));
  }, [user, periodFrom, periodTo]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  function applyPreset(days: number) {
    setPeriodPreset(days);
    setPeriodFrom(nDaysAgoISO(days));
    setPeriodTo(todayISO());
  }

  function resetFilters() {
    setFilterCommune("");
    setFilterTypeSupport("");
    setFilterEtatSupport("");
  }

  // ---------------------------------------------------------------------------
  // Calculs agrégés depuis les supports bruts
  // ---------------------------------------------------------------------------

  const totauxGlobaux = useMemo(() => {
    const totalTSP = supports.reduce((s, x) => s + (x.tsp ?? 0), 0);
    // CORRECTION : on somme odpValue directement, pas conditionnellement sur odp
    const totalODP = supports.reduce((s, x) => s + (x.odpValue ?? 0), 0);
    return {
      totalTSP,
      totalODP,
      totalCout: totalTSP + totalODP,
      totalSupports: supports.length,
    };
  }, [supports]);

  // TSP + ODP par état du support
  const parEtat = useMemo(() => {
    const etats = ["Bon", "Défraichi", "Détérioré"];
    return etats.map((etat) => {
      const group = supports.filter((s) => s.etatSupport === etat);
      const tsp = group.reduce((s, x) => s + (x.tsp ?? 0), 0);
      const odp = group.reduce((s, x) => s + (x.odpValue ?? 0), 0);
      return { etat, count: group.length, tsp, odp, total: tsp + odp };
    });
  }, [supports]);

  // TSP + ODP par type de support (top 6)
  const parType = useMemo(() => {
    const map: Record<string, { tsp: number; odp: number; count: number }> = {};
    supports.forEach((s) => {
      const k = s.typeSupport || "Non défini";
      if (!map[k]) map[k] = { tsp: 0, odp: 0, count: 0 };
      map[k].tsp += s.tsp ?? 0;
      map[k].odp += s.odpValue ?? 0;
      map[k].count += 1;
    });
    return Object.entries(map)
      .sort((a, b) => (b[1].tsp + b[1].odp) - (a[1].tsp + a[1].odp))
      .slice(0, 6)
      .map(([type, v]) => ({
        type,
        tsp: Math.round(v.tsp / 1000),    // en milliers pour lisibilité
        odp: Math.round(v.odp / 1000),
        count: v.count,
      }));
  }, [supports]);

  // TSP + ODP par commune (top 8)
  const parCommune = useMemo(() => {
    const map: Record<string, { tsp: number; odp: number }> = {};
    supports.forEach((s) => {
      const k = s.commune || "Inconnue";
      if (!map[k]) map[k] = { tsp: 0, odp: 0 };
      map[k].tsp += s.tsp ?? 0;
      map[k].odp += s.odpValue ?? 0;
    });
    return Object.entries(map)
      .sort((a, b) => (b[1].tsp + b[1].odp) - (a[1].tsp + a[1].odp))
      .slice(0, 8)
      .map(([commune, v]) => ({
        commune,
        tsp: Math.round(v.tsp / 1000),
        odp: Math.round(v.odp / 1000),
      }));
  }, [supports]);

  if (!user) return null;

  const totalSupports = data?.supportStatus.reduce((s, x) => s + x.count, 0) ?? 0;

  const filteredTopCommunes = data?.topCommunesCosts.filter((c) =>
    !filterCommune || c.commune === filterCommune
  ) ?? [];

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      {/* ===================== SIDEBAR ===================== */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B3C53]">
            <span className="text-base font-bold text-white">V</span>
          </div>
          <div>
            <p className="text-[15px] font-bold leading-tight text-slate-900">VisiTrack360</p>
            <p className="text-[11px] text-slate-400">Audit de Visibilité</p>
          </div>
        </div>

        <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
          <EntrepriseLogo entreprise={entreprise} size="md" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-800">
              {user.entrepriseNom ?? "Entreprise"}
            </p>
            <p className="text-[11px] text-slate-400">Compte entreprise</p>
          </div>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = item.href === ACTIVE_HREF;
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13px] font-medium transition-colors ${
                        isActive ? "bg-[#0B3C53] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                      }`}>
                      <Icon className="h-4 w-4" strokeWidth={2} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B3C53] text-xs font-bold text-white">
            {user.prenom?.[0]}{user.nom?.[0]}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-800">{user.nomComplet}</p>
            <p className="truncate text-[11px] text-slate-400">{user.role}</p>
          </div>
          <button onClick={logout} aria-label="Déconnexion">
            <LogOut className="ml-auto h-4 w-4 shrink-0 text-slate-300 hover:text-red-400" />
          </button>
        </div>
      </aside>

      {/* ===================== MAIN ===================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Dashboard Exécutif</h2>
            <p className="text-[12px] text-slate-400">Vue Direction</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-4">
              <EntrepriseLogo entreprise={entreprise} size="md" />
              <div className="hidden leading-tight sm:block">
                <p className="text-[13px] font-semibold text-slate-800">{user.nomComplet}</p>
                <p className="text-[11px] text-slate-400">{user.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          {/* ── Titre + contrôles ── */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="border-l-4 border-[#0B3C53] pl-3">
              <h1 className="text-2xl font-bold text-slate-900">Dashboard Exécutif</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Pilotage fiscal et opérationnel des supports de visibilité
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={loadDashboard}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-50" title="Actualiser">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition ${
                  showFilters || hasActiveFilters
                    ? "border-[#0B3C53] bg-[#0B3C53]/5 text-[#0B3C53]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}>
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
                {hasActiveFilters && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0B3C53] text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── Filtres enrichis ── */}
          {showFilters && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-700">Filtres avancés</p>
                <button onClick={() => setShowFilters(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Périodes */}
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Période</p>
                <div className="flex flex-wrap gap-2">
                  {PERIODES.map((p) => (
                    <button key={p.days} onClick={() => applyPreset(p.days)}
                      className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                        periodPreset === p.days ? "bg-[#0B3C53] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}>
                      {p.label}
                    </button>
                  ))}
                  <button onClick={() => setPeriodPreset(null)}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${
                      periodPreset === null ? "border-[#0B3C53] bg-[#0B3C53]/5 text-[#0B3C53]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}>
                    Personnalisé
                  </button>
                </div>
                {periodPreset === null && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 w-fit text-[13px] text-slate-600">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="outline-none text-[13px]" />
                    <span className="text-slate-400">→</span>
                    <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="outline-none text-[13px]" />
                  </div>
                )}
              </div>
              {/* Filtres par dimension */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "Commune", value: filterCommune, setter: setFilterCommune, options: filtresDisponibles?.communes ?? [] },
                  { label: "Type de support", value: filterTypeSupport, setter: setFilterTypeSupport, options: filtresDisponibles?.typesSupport ?? [] },
                  { label: "État du support", value: filterEtatSupport, setter: setFilterEtatSupport, options: filtresDisponibles?.etatsSupport ?? ["Bon", "Défraichi", "Détérioré"] },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{f.label}</p>
                    <select value={f.value} onChange={(e) => f.setter(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]">
                      <option value="">Tous</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {/* Tags filtres actifs */}
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {filterCommune && (
                    <span className="flex items-center gap-1 rounded-full bg-[#0B3C53]/10 px-2.5 py-1 text-[12px] font-medium text-[#0B3C53]">
                      Commune : {filterCommune}
                      <button onClick={() => setFilterCommune("")}><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {filterTypeSupport && (
                    <span className="flex items-center gap-1 rounded-full bg-[#0B3C53]/10 px-2.5 py-1 text-[12px] font-medium text-[#0B3C53]">
                      Type : {filterTypeSupport}
                      <button onClick={() => setFilterTypeSupport("")}><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {filterEtatSupport && (
                    <span className="flex items-center gap-1 rounded-full bg-[#0B3C53]/10 px-2.5 py-1 text-[12px] font-medium text-[#0B3C53]">
                      État : {filterEtatSupport}
                      <button onClick={() => setFilterEtatSupport("")}><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  <button onClick={resetFilters} className="ml-auto text-[12px] font-medium text-slate-500 hover:text-red-500">
                    Tout réinitialiser
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Chargement / erreur dashboard ── */}
          {isLoading && (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" />
            </div>
          )}
          {error && !isLoading && (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-[14px] text-slate-600">{error}</p>
              <button onClick={loadDashboard} className="rounded-lg bg-[#0B3C53] px-4 py-2 text-[13px] font-semibold text-white">Réessayer</button>
            </div>
          )}

          {data && !isLoading && (
            <>
              {/* ══════════════════════════════════════════════
                  SECTION 1 — KPIs fiscaux (depuis API dashboard)
              ══════════════════════════════════════════════ */}
              <div className="mb-2">
                <h2 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-slate-400">
                  Indicateurs fiscaux
                </h2>
              </div>
              <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                {data.kpis.map((kpi) => {
                  const style = KPI_STYLES[kpi.id];
                  const Icon = style?.icon ?? Boxes;
                  return (
                    <div key={kpi.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-start justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 leading-tight">
                          {kpi.label}
                        </p>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style?.badge ?? "bg-slate-400"}`}>
                          <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                        </div>
                      </div>
                      <p className="text-xl font-bold tabular-nums text-slate-900">
                        {formatNumber(kpi.value)}
                        {kpi.unit && <span className="ml-1 text-sm font-medium text-slate-400">{kpi.unit}</span>}
                      </p>
                      <div className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
                        kpi.trend.direction === "up" ? "text-emerald-600" : "text-red-500"
                      }`}>
                        {kpi.trend.direction === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {kpi.trend.value}{kpi.trend.value < 100 ? "%" : ""}
                        <span className="font-normal text-slate-400">{kpi.trend.comparedTo}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ══════════════════════════════════════════════
                  SECTION 2 — Données chiffrées TSP + ODP (depuis supports bruts)
              ══════════════════════════════════════════════ */}
              <div className="mb-2">
                <h2 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-slate-400">
                  Données chiffrées — Redevances supports
                </h2>
              </div>

              {supportsLoading ? (
                <div className="mb-6 flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <Loader2 className="h-6 w-6 animate-spin text-[#0B3C53]" />
                </div>
              ) : (
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    {
                      label: "Nombre total",
                      value: formatNumber(totauxGlobaux.totalSupports),
                      sub: "supports recensés",
                      icon: <Boxes className="h-5 w-5" />,
                      bg: "bg-[#0B3C53]",
                      textColor: "text-[#0B3C53]",
                    },
                    {
                      label: "Coût total TSP",
                      value: formatNumber(totauxGlobaux.totalTSP),
                      sub: "F CFA",
                      icon: <Wallet className="h-5 w-5" />,
                      bg: "bg-cyan-500",
                      textColor: "text-cyan-700",
                    },
                    {
                      label: "Coût total ODP",
                      value: formatNumber(totauxGlobaux.totalODP),
                      sub: "F CFA",
                      icon: <HandCoins className="h-5 w-5" />,
                      bg: "bg-violet-500",
                      textColor: "text-violet-700",
                    },
                    {
                      label: "Coût total supports",
                      value: formatNumber(totauxGlobaux.totalCout),
                      sub: "F CFA",
                      icon: <Coins className="h-5 w-5" />,
                      bg: "bg-emerald-500",
                      textColor: "text-emerald-700",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                        <span className="text-white">{item.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-400 leading-tight">{item.label}</p>
                        <p className={`mt-0.5 text-[20px] font-bold tabular-nums leading-tight ${item.textColor}`}>
                          {item.value}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  SECTION 3 — TSP / ODP par état + par type (2 graphiques)
              ══════════════════════════════════════════════ */}
              <div className="mb-2">
                <h2 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-slate-400">
                  Répartition TSP &amp; ODP
                </h2>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* État du support — 3 cartes mini */}
                <div className="xl:col-span-1 space-y-3">
                  <p className="text-[13px] font-semibold text-slate-600">Par état du support</p>
                  {parEtat.map((e) => (
                    <div key={e.etat} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[e.etat] ?? "#cbd5e1" }} />
                          <span className="text-[13px] font-bold text-slate-800">{e.etat}</span>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {e.count} supports
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-cyan-50 px-2 py-2">
                          <p className="text-[10px] font-medium text-cyan-600">TSP</p>
                          <p className="text-[13px] font-bold text-cyan-700 tabular-nums">
                            {formatNumber(e.tsp)}
                          </p>
                          <p className="text-[9px] text-cyan-500">F CFA</p>
                        </div>
                        <div className="rounded-lg bg-violet-50 px-2 py-2">
                          <p className="text-[10px] font-medium text-violet-600">ODP</p>
                          <p className="text-[13px] font-bold text-violet-700 tabular-nums">
                            {formatNumber(e.odp)}
                          </p>
                          <p className="text-[9px] text-violet-500">F CFA</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2 py-2">
                          <p className="text-[10px] font-medium text-slate-500">Total</p>
                          <p className="text-[13px] font-bold text-[#0B3C53] tabular-nums">
                            {formatNumber(e.total)}
                          </p>
                          <p className="text-[9px] text-slate-400">F CFA</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* TSP + ODP par type de support — bar chart */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                  <p className="mb-4 text-[13px] font-semibold text-slate-600">
                    TSP &amp; ODP par type de support (en milliers FCFA)
                  </p>
                  {parType.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-slate-400 text-[13px]">
                      Aucune donnée disponible.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={parType} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="type"
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `${v}k`}
                        />
                        <Tooltip formatter={(v) => [`${formatNumber((v as number) * 1000)} F CFA`]} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="tsp" name="TSP" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="odp" name="ODP" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* ══════════════════════════════════════════════
                  SECTION 4 — TSP + ODP par commune (bar chart horizontal)
              ══════════════════════════════════════════════ */}
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-slate-600">
                    TSP &amp; ODP par commune — Top 8 (en milliers FCFA)
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                    <BarChart3 className="inline h-3 w-3 mr-1" />
                    Valeurs réelles des supports
                  </span>
                </div>
                {parCommune.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-slate-400">Aucune donnée disponible.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={parCommune}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="commune"
                        tick={{ fontSize: 11, fill: "#475569" }}
                        axisLine={false}
                        tickLine={false}
                        width={75}
                      />
                      <Tooltip formatter={(v) => [`${formatNumber((v as number) * 1000)} F CFA`]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="tsp" name="TSP" fill="#06B6D4" radius={[0, 3, 3, 0]} />
                      <Bar dataKey="odp" name="ODP" fill="#8B5CF6" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* ══════════════════════════════════════════════
                  SECTION 5 — Grille : Top communes fiscales + État supports + Alertes
              ══════════════════════════════════════════════ */}
              <div className="mb-2">
                <h2 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-slate-400">
                  Analyse fiscale
                </h2>
              </div>
              <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Top communes montant réclamé */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[14px] font-bold text-slate-800">Top communes coûteuses</h2>
                    {filterCommune && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {filterCommune}
                      </span>
                    )}
                  </div>
                  {filteredTopCommunes.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-slate-400">Aucune donnée.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={filteredTopCommunes}>
                        <XAxis dataKey="commune" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1_000_000}M`} />
                        <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(value) => [`${formatNumber(value as number)} FCFA`, "Montant"]} />
                        <Bar dataKey="montantReclame" fill="#0B3C53" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <Link href="/analyse-fiscale" className="mt-2 inline-block text-[13px] font-semibold text-[#0B3C53] hover:underline">
                    Voir l&apos;analyse complète →
                  </Link>
                </div>

                {/* Donut état supports */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-[14px] font-bold text-slate-800">État des supports</h2>
                  <div className="relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data.supportStatus} dataKey="count" nameKey="label"
                          innerRadius={55} outerRadius={80} paddingAngle={3} stroke="none">
                          {data.supportStatus.map((entry) => (
                            <Cell key={entry.label} fill={DONUT_COLORS[entry.label] ?? "#cbd5e1"} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute flex flex-col items-center">
                      <p className="text-xl font-bold text-slate-900">{formatNumber(totalSupports)}</p>
                      <p className="text-[10px] text-slate-400">Total</p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {data.supportStatus.map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[s.label] ?? "#cbd5e1" }} />
                          <span className="font-medium text-slate-700">{s.label}</span>
                          <span className="text-slate-400">({formatNumber(s.count)})</span>
                        </div>
                        <span className="font-bold text-slate-700">{s.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alertes prioritaires */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-[14px] font-bold text-slate-800">Alertes prioritaires</h2>
                  {data.priorityAlerts.length === 0 ? (
                    <p className="text-[13px] text-slate-400">Aucune alerte en cours.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.priorityAlerts.map((alert) => (
                        <div key={alert.id} className="flex items-start gap-3">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${severityIconClasses(alert.severity as AlertSeverity)}`}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-slate-800">{alert.title}</p>
                            <p className="truncate text-[11px] text-slate-500">{alert.description}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{alert.timeAgo}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${severityBadgeClasses(alert.severity as AlertSeverity)}`}>
                            {alert.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ══════════════════════════════════════════════
                  SECTION 6 — Décision suggérée + Activité récente
              ══════════════════════════════════════════════ */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-[#0B3C53] to-[#0E4F66] p-6 text-white shadow-sm xl:col-span-2">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400">
                      <Lightbulb className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="mb-2 text-[14px] font-bold">Décision suggérée</h2>
                      <p className="text-[13px] leading-relaxed text-white/80">{data.decisionSuggestion.text}</p>
                      <button className="mt-4 rounded-lg bg-white px-4 py-2.5 text-[13px] font-bold text-[#0B3C53] hover:bg-white/90">
                        {data.decisionSuggestion.ctaLabel}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-[14px] font-bold text-slate-800">Activité récente</h2>
                  {data.recentActivity.length === 0 ? (
                    <p className="text-[13px] text-slate-400">Aucune activité récente.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.recentActivity.map((act) => (
                        <div key={act.id} className="flex items-start gap-3">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${activityIconClasses(act.type)}`}>
                            {activityIcon(act.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] leading-snug text-slate-700">{act.description}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{act.timeAgo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}