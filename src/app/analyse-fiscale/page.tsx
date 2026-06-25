"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type FormEvent,
} from "react";
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
  LogOut,
  Loader2,
  AlertCircle,
  Download,
  Plus,
  Calculator,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Search,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DossierFiscal {
  id: number;
  commune: string;
  fiscaliteEstimee: number;
  montantReclame: number;
  gapPotentiel: number;
}

interface AnalyseGap {
  commune: string;
  fiscaliteEstimee: number;
  montantReclame: number;
  montantRecalcule: number;
  montantNegocie: number;
  gap: number;
  gapPourcentage: number;
  economie: number | null;
  statut: "À négocier" | "À vérifier" | "Conforme";
  recommandation: string;
  totalSupports: number;
}

interface Simulation {
  id: number;
  nom: string;
  campagne: string;
  marque: string;
  statut: "brouillon" | "valide";
  commune: string;
  region: string;
  district: string;
  typeSupport: string;
  canal: string;
  surface: number | null;
  dureesMois: number;
  quantite: number;
  tauxTSP: number;
  odpApplicable: boolean;
  taxesCommunales: boolean;
  coutTSP: number;
  coutODP: number;
  coutTotal: number;
  riqueFiscal: string;
  creeLe: string;
}

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(v: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUT_BADGE: Record<string, string> = {
  "À négocier": "bg-red-100 text-red-700",
  "À vérifier": "bg-amber-100 text-amber-700",
  Conforme: "bg-emerald-100 text-emerald-700",
};

const STATUT_ICON: Record<string, ReactNode> = {
  "À négocier": <XCircle className="h-3.5 w-3.5" />,
  "À vérifier": <AlertTriangle className="h-3.5 w-3.5" />,
  Conforme: <CheckCircle2 className="h-3.5 w-3.5" />,
};

const RISQUE_BADGE: Record<string, string> = {
  Faible: "bg-emerald-100 text-emerald-700",
  Moyen: "bg-amber-100 text-amber-700",
  Élevé: "bg-red-100 text-red-700",
};

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

const ACTIVE_HREF = "/analyse-fiscale";

// ---------------------------------------------------------------------------
// Composants UI locaux
// ---------------------------------------------------------------------------

function FormField({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

interface TextInputProps {
  value: string | number | null;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
}

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  min,
}: TextInputProps) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53] focus:ring-1 focus:ring-[#0B3C53]/20"
    />
  );
}

interface SelectInputProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  required = false,
}: SelectInputProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

type Tab = "dossiers" | "simulation" | "gaps" | "graphiques";

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function AnalyseFiscalePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("dossiers");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  if (!user) return null;

  const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: "dossiers", label: "Dossiers fiscaux", icon: <Receipt className="h-4 w-4" /> },
    { key: "gaps", label: "Analyse des gaps", icon: <AlertTriangle className="h-4 w-4" /> },
    { key: "simulation", label: "Simulation fiscale", icon: <Calculator className="h-4 w-4" /> },
    { key: "graphiques", label: "Graphiques", icon: <LineChartIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      {/* ===================== OVERLAY MOBILE ===================== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ===================== SIDEBAR DESKTOP ===================== */}
      <aside
        className={`hidden flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out lg:flex ${
          sidebarCollapsed ? "w-16" : "w-64"
        } shrink-0`}
      >
        <div className={`flex items-center py-4 ${sidebarCollapsed ? "flex-col gap-2 px-2" : "justify-between px-4"}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B3C53]">
              <span className="text-base font-bold text-white">V</span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-[15px] font-bold leading-tight text-slate-900">VisiTrack360</p>
                <p className="text-[11px] text-slate-400">Audit de Visibilité</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label={sidebarCollapsed ? "Afficher le menu" : "Réduire le menu"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {!sidebarCollapsed ? (
          <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-white">
              {user.entrepriseNom?.slice(0, 3).toUpperCase() ?? "MTN"}
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-slate-800">{user.entrepriseNom ?? "Entreprise"}</p>
              <p className="text-[11px] text-slate-400">Compte entreprise</p>
            </div>
            <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-400" />
          </div>
        ) : (
          <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-white">
            {user.entrepriseNom?.slice(0, 3).toUpperCase() ?? "MTN"}
          </div>
        )}

        <nav className={`flex-1 space-y-5 overflow-y-auto pb-4 pt-2 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.label}
                </p>
              )}
              {sidebarCollapsed && <div className="my-2 h-px bg-slate-100" />}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = item.href === ACTIVE_HREF;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg py-2.5 text-[13px] font-medium transition-colors ${
                        sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
                      } ${
                        isActive ? "bg-[#0B3C53] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                      {!sidebarCollapsed && item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`flex items-center border-t border-slate-100 py-4 ${sidebarCollapsed ? "flex-col gap-2 px-2" : "gap-3 px-4"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B3C53] text-xs font-bold text-white">
            {user.prenom?.[0]}{user.nom?.[0]}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-semibold text-slate-800">{user.nomComplet}</p>
              <p className="truncate text-[11px] text-slate-400">{user.role}</p>
            </div>
          )}
          <button onClick={logout} aria-label="Déconnexion" className={sidebarCollapsed ? "" : "ml-auto"}>
            <LogOut className="h-4 w-4 shrink-0 text-slate-300 hover:text-red-400" />
          </button>
        </div>
      </aside>

      {/* ===================== SIDEBAR MOBILE ===================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu de navigation"
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B3C53]">
              <span className="text-base font-bold text-white">V</span>
            </div>
            <div>
              <p className="text-[15px] font-bold leading-tight text-slate-900">VisiTrack360</p>
              <p className="text-[11px] text-slate-400">Audit de Visibilité</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-white">
            {user.entrepriseNom?.slice(0, 3).toUpperCase() ?? "MTN"}
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-slate-800">{user.entrepriseNom ?? "Entreprise"}</p>
            <p className="text-[11px] text-slate-400">Compte entreprise</p>
          </div>
          <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-400" />
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
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13px] font-medium transition-colors ${
                        isActive ? "bg-[#0B3C53] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
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
          <button onClick={logout} aria-label="Déconnexion" className="ml-auto">
            <LogOut className="h-4 w-4 shrink-0 text-slate-300 hover:text-red-400" />
          </button>
        </div>
      </aside>

      {/* ===================== MAIN ===================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:block"
              aria-label={sidebarCollapsed ? "Afficher le menu" : "Masquer le menu"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Analyse fiscale</h2>
              <p className="hidden text-[12px] text-slate-400 sm:block">Gaps · Simulation · Dossiers</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 sm:pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B3C53] text-sm font-bold text-white">
                {user.prenom?.[0]}{user.nom?.[0]}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-[13px] font-semibold text-slate-800">{user.nomComplet}</p>
                <p className="text-[11px] text-slate-400">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">
          {/* Titre */}
          <div className="mb-6 border-l-4 border-[#0B3C53] pl-3">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Analyse fiscale</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Dossiers fiscaux, simulation de campagnes et analyse des écarts.
            </p>
          </div>

          {/* KPIs — toujours visibles */}
          <KpisFiscaux />

          {/* Onglets */}
          <div className="mb-6 mt-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors sm:px-4 ${
                  activeTab === tab.key
                    ? "bg-[#0B3C53] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenu par onglet */}
          {activeTab === "dossiers" && <DossiersFiscauxTab />}
          {activeTab === "gaps" && <AnalyseGapsTab />}
          {activeTab === "simulation" && <SimulationTab />}
          {activeTab === "graphiques" && <GraphiquesTab />}
        </main>
      </div>
    </div>
  );
}

// ===========================================================================
// KPIs toujours visibles
// ===========================================================================

function KpisFiscaux() {
  const [data, setData] = useState<DossierFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<PaginatedResponse<DossierFiscal> | DossierFiscal[]>("/api/dossiers-fiscaux/")
      .then((res) => {
        setData(Array.isArray(res) ? res : res.results);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const totaux = useMemo(() => {
    const fiscalite = data.reduce((s, d) => s + d.fiscaliteEstimee, 0);
    const reclame = data.reduce((s, d) => s + d.montantReclame, 0);
    const gap = data.reduce((s, d) => s + d.gapPotentiel, 0);
    const couverture = reclame > 0 ? Math.round((fiscalite / reclame) * 100) : 0;
    return { fiscalite, reclame, gap, couverture };
  }, [data]);

  const kpis = [
    {
      label: "Fiscalité estimée",
      value: isLoading ? "—" : `${formatNumber(totaux.fiscalite)} FCFA`,
      icon: <Calculator className="h-4 w-4 text-white" />,
      badge: "bg-blue-500",
      trend: "up" as const,
    },
    {
      label: "Montant réclamé",
      value: isLoading ? "—" : `${formatNumber(totaux.reclame)} FCFA`,
      icon: <Receipt className="h-4 w-4 text-white" />,
      badge: "bg-violet-500",
      trend: "up" as const,
    },
    {
      label: "Gap potentiel total",
      value: isLoading ? "—" : `${formatNumber(totaux.gap)} FCFA`,
      icon: <AlertTriangle className="h-4 w-4 text-white" />,
      badge: "bg-orange-500",
      trend: "down" as const,
    },
    {
      label: "Taux de couverture",
      value: isLoading ? "—" : `${totaux.couverture} %`,
      icon: <TrendingUp className="h-4 w-4 text-white" />,
      badge: "bg-emerald-500",
      trend: "up" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {kpi.label}
            </p>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kpi.badge}`}>
              {kpi.icon}
            </div>
          </div>
          {isLoading ? (
            <div className="h-7 w-24 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="text-xl font-bold tabular-nums text-slate-900">{kpi.value}</p>
          )}
          <div className={`mt-2 flex items-center gap-1 text-[12px] font-medium ${
            kpi.trend === "up" ? "text-emerald-600" : "text-red-500"
          }`}>
            {kpi.trend === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span className="text-slate-400">vs période précédente</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================================================
// Onglet Dossiers fiscaux
// ===========================================================================

function DossiersFiscauxTab() {
  const [dossiers, setDossiers] = useState<DossierFiscal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DossierFiscal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DossierFiscal | null>(null);
  const [form, setForm] = useState({
    commune: "",
    fiscaliteEstimee: "",
    montantReclame: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<PaginatedResponse<DossierFiscal> | DossierFiscal[]>("/api/dossiers-fiscaux/");
      setDossiers(Array.isArray(res) ? res : res.results);
    } catch {
      setError("Impossible de charger les dossiers fiscaux.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ commune: "", fiscaliteEstimee: "", montantReclame: "" });
    setValidationErrors({});
    setModalOpen(true);
  }

  function openEdit(d: DossierFiscal) {
    setEditing(d);
    setForm({
      commune: d.commune,
      fiscaliteEstimee: String(d.fiscaliteEstimee),
      montantReclame: String(d.montantReclame),
    });
    setValidationErrors({});
    setModalOpen(true);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    
    if (!form.commune?.trim()) {
      errors.commune = "La commune est obligatoire";
    }
    if (!form.fiscaliteEstimee || parseFloat(form.fiscaliteEstimee) <= 0) {
      errors.fiscaliteEstimee = "La fiscalité estimée est obligatoire et doit être supérieure à 0";
    }
    if (!form.montantReclame || parseFloat(form.montantReclame) <= 0) {
      errors.montantReclame = "Le montant réclamé est obligatoire et doit être supérieur à 0";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    setIsSubmitting(true);
    try {
        const fiscaliteValue = parseFloat(form.fiscaliteEstimee);
        const montantValue = parseFloat(form.montantReclame);
        
        const payload = {
          commune: form.commune.trim(),
          fiscaliteEstimee: fiscaliteValue,
          montantReclame: montantValue,
        };
        
        if (editing) {
          const updated = await apiFetch<DossierFiscal>(`/api/dossiers-fiscaux/${editing.id}/`, {
            method: "PATCH", 
            body: JSON.stringify(payload),
          });
          setDossiers((prev) => prev.map((d) => d.id === updated.id ? updated : d));
        } else {
          const created = await apiFetch<DossierFiscal>("/api/dossiers-fiscaux/", {
            method: "POST", 
            body: JSON.stringify(payload),
          });
          setDossiers((prev) => [created, ...prev]);
        }
        setModalOpen(false);
        setValidationErrors({});
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert("Erreur lors de la sauvegarde. Vérifiez que tous les champs sont correctement remplis.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/dossiers-fiscaux/${deleteTarget.id}/`, { method: "DELETE" });
      setDossiers((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert("Erreur lors de la suppression.");
    }
  }

  const filtered = dossiers.filter((d) =>
    !search || d.commune.toLowerCase().includes(search.toLowerCase())
  );

  function handleExport() {
    exportCSV(
      filtered.map((d) => ({
        Commune: d.commune,
        "Fiscalité estimée (FCFA)": d.fiscaliteEstimee,
        "Montant réclamé (FCFA)": d.montantReclame,
        "Gap potentiel (FCFA)": d.gapPotentiel,
      })),
      "dossiers_fiscaux"
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une commune..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
          />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90"
        >
          <Plus className="h-4 w-4" />
          Nouveau dossier
        </button>
      </div>

      {isLoading && <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" /></div>}
      {error && <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3"><AlertCircle className="h-4 w-4 text-red-500" /><p className="text-[13px] text-red-700">{error}</p></div>}

      {!isLoading && !error && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Commune</th>
                  <th className="px-3 py-2.5">Fiscalité estimée</th>
                  <th className="px-3 py-2.5">Montant réclamé</th>
                  <th className="px-3 py-2.5">Gap potentiel</th>
                  <th className="px-3 py-2.5">Risque</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const gapPct = d.montantReclame > 0
                    ? Math.round((d.gapPotentiel / d.montantReclame) * 100)
                    : 0;
                  const risque = gapPct > 20 ? "Élevé" : gapPct > 5 ? "Moyen" : "Faible";
                  return (
                    <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-800">{d.commune}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {formatNumber(d.fiscaliteEstimee)} FCFA
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {formatNumber(d.montantReclame)} FCFA
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-orange-600">
                        {formatNumber(d.gapPotentiel)} FCFA
                        <span className="ml-1 text-[11px] text-slate-400">({gapPct}%)</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${RISQUE_BADGE[risque]}`}>
                          {risque}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(d)} className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(d)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Aucun dossier fiscal.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal CRUD */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[16px] font-bold text-slate-900">
                {editing ? "Modifier le dossier" : "Nouveau dossier fiscal"}
              </h2>
              <button 
                onClick={() => {
                  setModalOpen(false);
                  setValidationErrors({});
                }} 
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {Object.keys(validationErrors).length > 0 && (
              <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <ul className="list-disc pl-4 text-sm text-red-600">
                  {Object.entries(validationErrors).map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <FormField label="Commune *" required>
                <TextInput 
                  value={form.commune} 
                  onChange={(v) => {
                    setForm((f) => ({ ...f, commune: v }));
                    if (validationErrors.commune) {
                      setValidationErrors((prev) => ({ ...prev, commune: "" }));
                    }
                  }} 
                  required 
                  placeholder="ex: Cocody"
                />
              </FormField>
              
              <FormField label="Fiscalité estimée (FCFA) *" required>
                <TextInput 
                  type="number" 
                  value={form.fiscaliteEstimee} 
                  onChange={(v) => {
                    setForm((f) => ({ ...f, fiscaliteEstimee: v }));
                    if (validationErrors.fiscaliteEstimee) {
                      setValidationErrors((prev) => ({ ...prev, fiscaliteEstimee: "" }));
                    }
                  }}
                  required
                  min="0"
                  placeholder="ex: 1000000"
                />
              </FormField>
              
              <FormField label="Montant réclamé (FCFA) *" required>
                <TextInput 
                  type="number" 
                  value={form.montantReclame} 
                  onChange={(v) => {
                    setForm((f) => ({ ...f, montantReclame: v }));
                    if (validationErrors.montantReclame) {
                      setValidationErrors((prev) => ({ ...prev, montantReclame: "" }));
                    }
                  }}
                  required
                  min="0"
                  placeholder="ex: 500000"
                />
              </FormField>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setModalOpen(false);
                    setValidationErrors({});
                  }} 
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90 disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="mb-1.5 text-[15px] font-bold text-slate-900">Supprimer ?</h3>
            <p className="mb-5 text-[13px] text-slate-500">Dossier fiscal de <span className="font-medium text-slate-700">{deleteTarget.commune}</span> sera supprimé.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600">Annuler</button>
              <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Onglet Analyse des gaps
// ===========================================================================

function AnalyseGapsTab() {
  const [gaps, setGaps] = useState<AnalyseGap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCommune, setFilterCommune] = useState("");
  const [filterStatut, setFilterStatut] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterCommune) params.set("commune", filterCommune);
      const data = await apiFetch<AnalyseGap[]>(`/api/analyse-gaps/?${params}`);
      setGaps(data);
    } catch {
      setError("Impossible de charger l'analyse des gaps.");
    } finally {
      setIsLoading(false);
    }
  }, [filterCommune]);

  useEffect(() => { load(); }, [load]);

  const communes = useMemo(() => [...new Set(gaps.map((g) => g.commune))], [gaps]);

  const filtered = useMemo(() =>
    gaps.filter((g) => !filterStatut || g.statut === filterStatut),
    [gaps, filterStatut]
  );

  function handleExport() {
    exportCSV(
      filtered.map((g) => ({
        Commune: g.commune,
        "Montant réclamé (FCFA)": g.montantReclame,
        "Montant recalculé (FCFA)": g.montantRecalcule,
        "Gap (FCFA)": g.gap,
        "Gap (%)": g.gapPourcentage,
        "Économie réalisée (FCFA)": g.economie ?? 0,
        Statut: g.statut,
        Recommandation: g.recommandation,
        "Supports totaux": g.totalSupports,
      })),
      "analyse_gaps"
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-400">Commune</span>
          <select
            value={filterCommune}
            onChange={(e) => setFilterCommune(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
          >
            <option value="">Toutes</option>
            {communes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-400">Statut</span>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
          >
            <option value="">Tous</option>
            {["À négocier", "À vérifier", "Conforme"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button
          onClick={load}
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </button>
        <button
          onClick={handleExport}
          className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {isLoading && <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" /></div>}
      {error && <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3"><AlertCircle className="h-4 w-4 text-red-500" /><p className="text-[13px] text-red-700">{error}</p></div>}

      {!isLoading && !error && (
        <div className="space-y-4">
          {filtered.map((g) => (
            <div key={g.commune} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-[15px] font-bold text-slate-900">{g.commune}</h3>
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUT_BADGE[g.statut]}`}>
                    {STATUT_ICON[g.statut]}
                    {g.statut}
                  </span>
                </div>
                <span className="text-[12px] text-slate-400">{g.totalSupports} supports recensés</span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
                {[
                  { label: "Fiscalité estimée", value: `${formatNumber(g.fiscaliteEstimee)} FCFA`, color: "text-blue-600" },
                  { label: "Montant réclamé", value: `${formatNumber(g.montantReclame)} FCFA`, color: "text-violet-600" },
                  { label: "Montant recalculé", value: `${formatNumber(g.montantRecalcule)} FCFA`, color: "text-slate-700" },
                  { label: "Gap", value: `${formatNumber(g.gap)} FCFA (${g.gapPourcentage}%)`, color: g.gapPourcentage > 20 ? "text-red-600" : g.gapPourcentage > 5 ? "text-amber-600" : "text-emerald-600" },
                  { label: "Économie réalisée", value: g.economie ? `${formatNumber(g.economie)} FCFA` : "—", color: "text-emerald-600" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-[11px] text-slate-400">{item.label}</p>
                    <p className={`text-[13px] font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="text-slate-500">Gap / Montant réclamé</span>
                  <span className="font-semibold text-slate-700">{g.gapPourcentage}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      g.gapPourcentage > 20 ? "bg-red-500" : g.gapPourcentage > 5 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(g.gapPourcentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-[13px] text-blue-700">{g.recommandation}</p>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400">Aucune analyse de gap disponible.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Onglet Simulation fiscale - CORRIGÉ
// ===========================================================================

function SimulationTab() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultModal, setResultModal] = useState<Simulation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [form, setForm] = useState({
    nom: "",
    campagne: "",
    marque: "",
    commune: "",
    region: "",
    district: "",
    typeSupport: "",
    canal: "",
    surface: "",
    dureesMois: "12",
    quantite: "1",
    tauxTSP: "5",
    odpApplicable: false,
    taxesCommunales: false,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setIsLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<Simulation> | Simulation[]>("/api/simulations/");
      setSimulations(Array.isArray(res) ? res : res.results);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

    async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsCalculating(true);
    try {
        const payload = {
        nom: form.nom,
        campagne: form.campagne,
        marque: form.marque,
        commune: form.commune,
        region: form.region,
        district: form.district || "",
        typeSupport: form.typeSupport,      // ← camelCase, mappé par le serializer
        canal: form.canal || "",
        surface: form.surface ? parseFloat(form.surface) : null,
        dureesMois: parseInt(form.dureesMois) || 12,   // ← camelCase
        quantite: parseInt(form.quantite) || 1,
        tauxTSP: parseFloat(form.tauxTSP) || 5,        // ← camelCase
        odpApplicable: form.odpApplicable,              // ← camelCase
        taxesCommunales: form.taxesCommunales,          // ← camelCase
        // ← PLUS de coutTSP, coutODP, coutTotal, riqueFiscal, statut
        };

        const created = await apiFetch<Simulation>("/api/simulations/", {
        method: "POST",
        body: JSON.stringify(payload),
        });
        setSimulations((prev) => [created, ...prev]);
        setResultModal(created);
        setModalOpen(false);
    } catch (error) {
        console.error("Erreur:", error);
        alert("Erreur lors de la simulation.");
    } finally {
        setIsCalculating(false);
    }
    }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/api/simulations/${id}/`, { method: "DELETE" });
      setSimulations((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Erreur lors de la suppression.");
    }
  }

  function handleExport() {
    exportCSV(
      simulations.map((s) => ({
        Nom: s.nom,
        Campagne: s.campagne,
        Marque: s.marque,
        Commune: s.commune,
        "Type support": s.typeSupport,
        "Surface (m²)": s.surface ?? "",
        "Durée (mois)": s.dureesMois,
        Quantité: s.quantite,
        "Taux TSP (%)": s.tauxTSP,
        "Coût TSP (FCFA)": s.coutTSP,
        "Coût ODP (FCFA)": s.coutODP,
        "Coût total (FCFA)": s.coutTotal,
        "Risque fiscal": s.riqueFiscal,
        Statut: s.statut,
      })),
      "simulations_fiscales"
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle simulation
        </button>
      </div>

      {isLoading && <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" /></div>}

      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {simulations.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-900">{s.nom}</h3>
                  <p className="text-[12px] text-slate-400">{s.campagne} · {s.commune}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${RISQUE_BADGE[s.riqueFiscal] ?? "bg-slate-100 text-slate-600"}`}>
                    Risque {s.riqueFiscal}
                  </span>
                  <button onClick={() => setResultModal(s)} className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                    <Calculator className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Coût TSP", value: `${formatNumber(s.coutTSP)} FCFA`, color: "text-blue-600" },
                  { label: "Coût ODP", value: `${formatNumber(s.coutODP)} FCFA`, color: "text-violet-600" },
                  { label: "Coût total", value: `${formatNumber(s.coutTotal)} FCFA`, color: "text-[#0B3C53] font-bold" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-[11px] text-slate-400">{item.label}</p>
                    <p className={`text-[13px] ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3 text-[12px] text-slate-400">
                <span>{s.typeSupport}</span>
                <span>·</span>
                <span>{s.surface ? `${s.surface} m²` : "—"}</span>
                <span>·</span>
                <span>{s.dureesMois} mois</span>
                <span>·</span>
                <span>x{s.quantite}</span>
                <span className="ml-auto">{formatDate(s.creeLe)}</span>
              </div>
            </div>
          ))}

          {simulations.length === 0 && (
            <div className="col-span-2 py-12 text-center text-slate-400">
              Aucune simulation. Créez-en une pour estimer le coût fiscal d&apos;une campagne.
            </div>
          )}
        </div>
      )}

      {/* Modal création simulation - CORRIGÉE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[16px] font-bold text-slate-900">Nouvelle simulation fiscale</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Identification - tous les champs sont maintenant remplis par défaut */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Identification</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Nom de la simulation *">
                    <TextInput 
                      value={form.nom} 
                      onChange={(v) => setForm((f) => ({ ...f, nom: v }))} 
                      required 
                      placeholder="ex: Campagne Q4"
                    />
                  </FormField>
                  <FormField label="Campagne *">
                    <TextInput 
                      value={form.campagne} 
                      onChange={(v) => setForm((f) => ({ ...f, campagne: v }))} 
                      required
                      placeholder="ex: Noël 2024"
                    />
                  </FormField>
                  <FormField label="Marque *">
                    <TextInput 
                      value={form.marque} 
                      onChange={(v) => setForm((f) => ({ ...f, marque: v }))} 
                      required
                      placeholder="ex: MTN"
                    />
                  </FormField>
                </div>
              </div>

              {/* Zone */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Zone de déploiement</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Commune *">
                    <TextInput 
                      value={form.commune} 
                      onChange={(v) => setForm((f) => ({ ...f, commune: v }))} 
                      required
                      placeholder="ex: Plateau"
                    />
                  </FormField>
                  <FormField label="Région">
                    <TextInput 
                      value={form.region} 
                      onChange={(v) => setForm((f) => ({ ...f, region: v }))} 
                      placeholder="ex: Abidjan"
                    />
                  </FormField>
                  <FormField label="District">
                    <TextInput 
                      value={form.district} 
                      onChange={(v) => setForm((f) => ({ ...f, district: v }))} 
                      placeholder="ex: Abidjan"
                    />
                  </FormField>
                </div>
              </div>

              {/* Support */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Support publicitaire</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Type de support *">
                    <SelectInput
                      value={form.typeSupport}
                      onChange={(v) => setForm((f) => ({ ...f, typeSupport: v }))}
                      options={["Panneau 4x3", "Bâche", "Totem", "Vitrine", "Panneau lumineux"]}
                      placeholder="— Choisir —"
                      required
                    />
                  </FormField>
                  <FormField label="Canal">
                    <SelectInput
                      value={form.canal}
                      onChange={(v) => setForm((f) => ({ ...f, canal: v }))}
                      options={["Affichage", "Bâche", "Panneau lumineux", "Totem", "Vitrine"]}
                      placeholder="— Choisir —"
                    />
                  </FormField>
                  <FormField label="Surface (m²)">
                    <TextInput 
                      type="number" 
                      value={form.surface} 
                      onChange={(v) => setForm((f) => ({ ...f, surface: v }))} 
                      placeholder="ex: 12" 
                      min="0"
                    />
                  </FormField>
                  <FormField label="Durée (mois) *">
                    <TextInput 
                      type="number" 
                      value={form.dureesMois} 
                      onChange={(v) => setForm((f) => ({ ...f, dureesMois: v }))} 
                      required
                      min="1"
                    />
                  </FormField>
                  <FormField label="Quantité *">
                    <TextInput 
                      type="number" 
                      value={form.quantite} 
                      onChange={(v) => setForm((f) => ({ ...f, quantite: v }))} 
                      required
                      min="1"
                    />
                  </FormField>
                </div>
              </div>

              {/* Fiscalité */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Paramètres fiscaux</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Taux TSP (%) *">
                    <TextInput 
                      type="number" 
                      value={form.tauxTSP} 
                      onChange={(v) => setForm((f) => ({ ...f, tauxTSP: v }))} 
                      required
                      min="0"
                      placeholder="5"
                    />
                  </FormField>
                  <div className="col-span-2 flex items-end gap-6 pb-2">
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.odpApplicable}
                        onChange={(e) => setForm((f) => ({ ...f, odpApplicable: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 accent-[#0B3C53]"
                      />
                      ODP applicable
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.taxesCommunales}
                        onChange={(e) => setForm((f) => ({ ...f, taxesCommunales: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 accent-[#0B3C53]"
                      />
                      Taxes communales
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCalculating}
                  className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                  Calculer & Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal résultats simulation */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[16px] font-bold text-slate-900">Résultats — {resultModal.nom}</h2>
              <button onClick={() => setResultModal(null)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="mb-5 grid grid-cols-3 gap-4">
                {[
                  { label: "Coût TSP estimé", value: `${formatNumber(resultModal.coutTSP)} FCFA`, color: "text-blue-600" },
                  { label: "Coût ODP", value: `${formatNumber(resultModal.coutODP)} FCFA`, color: "text-violet-600" },
                  { label: "Coût total estimé", value: `${formatNumber(resultModal.coutTotal)} FCFA`, color: "text-[#0B3C53]" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 p-4 text-center">
                    <p className="mb-1 text-[11px] text-slate-400">{item.label}</p>
                    <p className={`text-[15px] font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className={`flex items-center gap-3 rounded-xl p-4 ${
                resultModal.riqueFiscal === "Élevé" ? "bg-red-50" :
                resultModal.riqueFiscal === "Moyen" ? "bg-amber-50" : "bg-emerald-50"
              }`}>
                <AlertTriangle className={`h-5 w-5 shrink-0 ${
                  resultModal.riqueFiscal === "Élevé" ? "text-red-500" :
                  resultModal.riqueFiscal === "Moyen" ? "text-amber-500" : "text-emerald-500"
                }`} />
                <div>
                  <p className={`text-[13px] font-bold ${
                    resultModal.riqueFiscal === "Élevé" ? "text-red-700" :
                    resultModal.riqueFiscal === "Moyen" ? "text-amber-700" : "text-emerald-700"
                  }`}>
                    Risque fiscal : {resultModal.riqueFiscal}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {resultModal.riqueFiscal === "Élevé"
                      ? "Coût élevé — arbitrage recommandé avant engagement terrain."
                      : resultModal.riqueFiscal === "Moyen"
                      ? "Coût modéré — vérifier les taux applicables par commune."
                      : "Coût maîtrisé — campagne budgétairement conforme."}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[13px] text-slate-600">
                {[
                  ["Zone", resultModal.commune || "—"],
                  ["Type support", resultModal.typeSupport || "—"],
                  ["Surface", resultModal.surface ? `${resultModal.surface} m²` : "—"],
                  ["Durée", `${resultModal.dureesMois} mois`],
                  ["Quantité", String(resultModal.quantite)],
                  ["Taux TSP", `${resultModal.tauxTSP}%`],
                  ["ODP applicable", resultModal.odpApplicable ? "Oui" : "Non"],
                  ["Taxes communales", resultModal.taxesCommunales ? "Oui" : "Non"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-medium text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => exportCSV([{
                  Nom: resultModal.nom,
                  Commune: resultModal.commune,
                  "Coût TSP (FCFA)": resultModal.coutTSP,
                  "Coût ODP (FCFA)": resultModal.coutODP,
                  "Coût total (FCFA)": resultModal.coutTotal,
                  "Risque fiscal": resultModal.riqueFiscal,
                }], "simulation")}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Exporter
              </button>
              <button onClick={() => setResultModal(null)} className="rounded-lg bg-[#0B3C53] px-4 py-2 text-[13px] font-semibold text-white">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Onglet Graphiques
// ===========================================================================

function GraphiquesTab() {
  const [dossiers, setDossiers] = useState<DossierFiscal[]>([]);
  const [gaps, setGaps] = useState<AnalyseGap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<PaginatedResponse<DossierFiscal> | DossierFiscal[]>("/api/dossiers-fiscaux/"),
      apiFetch<AnalyseGap[]>("/api/analyse-gaps/"),
    ])
      .then(([d, g]) => {
        setDossiers(Array.isArray(d) ? d : d.results);
        setGaps(g);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" /></div>;
  }

  const barData = dossiers.map((d) => ({
    commune: d.commune,
    fiscalite: Math.round(d.fiscaliteEstimee / 1_000_000),
    reclame: Math.round(d.montantReclame / 1_000_000),
    gap: Math.round(d.gapPotentiel / 1_000_000),
  }));

  const gapData = gaps.map((g) => ({
    commune: g.commune,
    gap: Math.round(g.gap / 1_000_000),
    pct: g.gapPourcentage,
  }));

  return (
    <div className="space-y-6">
      {/* Graphique 1 : Fiscalité vs Montant réclamé vs Gap par commune */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-[14px] font-bold text-slate-800">
          Fiscalité estimée vs Montant réclamé vs Gap — par commune (M FCFA)
        </h2>
        {barData.length === 0 ? (
          <p className="py-8 text-center text-slate-400">Aucune donnée disponible.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="commune" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
              <Tooltip formatter={(v) => [`${v as number}M FCFA`]} />
              <Legend />
              <Bar dataKey="fiscalite" name="Fiscalité estimée" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="reclame" name="Montant réclamé" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gap" name="Gap potentiel" fill="#F97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Graphique 2 : Gap en % par commune */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-[14px] font-bold text-slate-800">
          Gap potentiel en % par commune
        </h2>
        {gapData.length === 0 ? (
          <p className="py-8 text-center text-slate-400">Aucune donnée disponible.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={gapData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="commune" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v as number}%`, "Gap"]} />
              <Bar
                dataKey="pct"
                name="Gap (%)"
                radius={[0, 4, 4, 0]}
                fill="#0B3C53"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Graphique 3 : Évolution des gaps (line chart simulé sur 6 mois) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-[14px] font-bold text-slate-800">
          Tendance des gaps — 6 derniers mois (simulation)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={[
              { mois: "Jan", gap: 45, reclame: 120 },
              { mois: "Fév", gap: 38, reclame: 115 },
              { mois: "Mar", gap: 52, reclame: 130 },
              { mois: "Avr", gap: 35, reclame: 118 },
              { mois: "Mai", gap: 41, reclame: 122 },
              { mois: "Juin", gap: 33, reclame: 110 },
            ]}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
            <Tooltip formatter={(v) => [`${v as number}M FCFA`]} />
            <Legend />
            <Line type="monotone" dataKey="gap" name="Gap potentiel" stroke="#F97316" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="reclame" name="Montant réclamé" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[11px] text-slate-400">
          * Les données de tendance mensuelle seront calculées automatiquement une fois les ordres de recettes historisés.
        </p>
      </div>
    </div>
  );
}