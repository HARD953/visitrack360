"use client";

import type { ElementType } from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Map,
  LineChart as LineChartIcon,
  Receipt,
  FileBarChart,
  ShieldCheck,
  Bell,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Loader2,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  BarChart2,
  TrendingUp,
  TrendingDown,
  FileText,
  FileSpreadsheet,
  FilePieChart,
  CheckCircle2,
  Search,
  ChevronRight,
  Printer,
  Share2,
  ArrowUpRight,
  Layers,
  MapPin,
  Clock,
  Eye,
  Handshake
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";

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

interface SupportPublicitaire {
  id: number;
  marque: string;
  entreprise: string;
  commune: string;
  region: string;
  district: string;
  typeSupport: string;
  etatSupport: string;
  surface: number;
  nombreSupport: number;
  nombreFace: number;
  surfaceODP: number;
  tsp: number;
  odpValue: number;
  canal: string;
  visibilite: string;
  dateCollecte: string;
  latitude: number | null;
  longitude: number | null;
}

interface RapportFilters {
  dateDebut: string;
  dateFin: string;
  commune: string;
  region: string;
  district: string;
  typeSupport: string;
  etatSupport: string;
  entreprise: string;
  canal: string;
}

interface KpiRapport {
  id: string;
  label: string;
  value: number;
  unit?: string;
  delta?: number;
  deltaDir?: "up" | "down";
}

interface ChartPoint {
  label: string;
  value: number;
  secondValue?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(v: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v));
}

function fmtM(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDateFR(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function logoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}

// Agréger les supports en séries temporelles (par mois)
function aggregateByMonth(supports: SupportPublicitaire[]): ChartPoint[] {
  const map: Record<string, number> = {};
  for (const s of supports) {
    const key = s.dateCollecte?.slice(0, 7) ?? "??";
    map[key] = (map[key] ?? 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}

function aggregateByField(
  supports: SupportPublicitaire[],
  field: keyof SupportPublicitaire,
  valueField: keyof SupportPublicitaire = "nombreSupport"
): ChartPoint[] {
  const map: Record<string, number> = {};
  for (const s of supports) {
    const key = String(s[field] ?? "—");
    map[key] = (map[key] ?? 0) + (Number(s[valueField]) || 1);
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));
}

function aggregateRevenu(supports: SupportPublicitaire[]): ChartPoint[] {
  const map: Record<string, { tsp: number; odp: number }> = {};
  for (const s of supports) {
    const key = s.commune ?? "—";
    if (!map[key]) map[key] = { tsp: 0, odp: 0 };
    map[key].tsp += Number(s.tsp) || 0;
    map[key].odp += Number(s.odpValue) || 0;
  }
  return Object.entries(map)
    .map(([label, { tsp, odp }]) => ({ label, value: tsp, secondValue: odp }))
    .sort((a, b) => (b.value + (b.secondValue ?? 0)) - (a.value + (a.secondValue ?? 0)))
    .slice(0, 8);
}

// Radar coverage
function buildRadarData(supports: SupportPublicitaire[]) {
  const communes = new Set(supports.map((s) => s.commune)).size;
  const types = new Set(supports.map((s) => s.typeSupport)).size;
  const bonEtat = supports.filter((s) => s.etatSupport === "Bon").length;
  const total = supports.length || 1;
  return [
    { subject: "Communes couvertes", A: Math.min((communes / 10) * 100, 100) },
    { subject: "Types support", A: Math.min((types / 8) * 100, 100) },
    { subject: "État Bon (%)", A: Math.round((bonEtat / total) * 100) },
    { subject: "Couverture ODP", A: Math.min((supports.filter((s) => s.surfaceODP > 0).length / total) * 100, 100) },
    { subject: "Diversité canaux", A: Math.min((new Set(supports.map((s) => s.canal)).size / 5) * 100, 100) },
  ];
}

// ---------------------------------------------------------------------------
// Couleurs
// ---------------------------------------------------------------------------

const COLORS = ["#0B3C53", "#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#EC4899", "#14B8A6"];
const ETAT_COLORS: Record<string, string> = {
  Bon: "#10B981",
  Défraichi: "#F59E0B",
  Détérioré: "#EF4444",
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
    //   { label: "Negociations fiscale", href: "/negociations", icon: Handshake },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Administration", href: "/administration", icon: ShieldCheck },
    ],
  },
];

const ACTIVE_HREF = "/rapports-exports";

// ---------------------------------------------------------------------------
// Composant Logo
// ---------------------------------------------------------------------------

function EntrepriseLogo({ entreprise, size = "md" }: {
  entreprise: Entreprise | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-[11px]", lg: "h-12 w-12 text-sm" };
  const url = entreprise?.logo ? logoUrl(entreprise.logo) : null;
  const fb = (entreprise?.sigle?.slice(0, 3) || entreprise?.nom?.slice(0, 2) || "?").toUpperCase();
  if (url) return <img src={url} alt={entreprise?.nom ?? ""} className={`${cls[size]} rounded-full object-cover border border-slate-200`} />;
  return <div className={`${cls[size]} flex items-center justify-center rounded-full bg-amber-400 font-bold text-white`}>{fb}</div>;
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function SidebarContent({ user, entreprise, logout, onClose, collapsed = false, onToggleCollapse }: {
  user: { nomComplet: string; prenom?: string; nom?: string; role: string; entrepriseNom?: string | null };
  entreprise: Entreprise | null;
  logout: () => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <>
      <div className={`flex items-center py-4 ${collapsed ? "flex-col gap-2 px-2" : "justify-between px-4"}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B3C53]">
            <span className="text-base font-bold text-white">V</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-[15px] font-bold leading-tight text-slate-900">VisiTrack360</p>
              <p className="text-[11px] text-slate-400">Audit de Visibilité</p>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button onClick={onToggleCollapse} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
        {onClose && <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>}
      </div>

      {!collapsed ? (
        <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
          <EntrepriseLogo entreprise={entreprise} size="md" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-800">{user.entrepriseNom ?? "Entreprise"}</p>
            <p className="text-[11px] text-slate-400">Compte entreprise</p>
          </div>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
        </div>
      ) : (
        <div className="mx-auto mb-3"><EntrepriseLogo entreprise={entreprise} size="sm" /></div>
      )}

      <nav className={`flex-1 space-y-5 overflow-y-auto pb-4 pt-2 ${collapsed ? "px-2" : "px-3"}`}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{section.label}</p>}
            {collapsed && <div className="my-2 h-px bg-slate-100" />}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = item.href === ACTIVE_HREF;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                    className={`flex items-center rounded-lg py-2.5 text-[13px] font-medium transition-colors ${collapsed ? "justify-center px-2" : "gap-2.5 px-2.5"} ${isActive ? "bg-[#0B3C53] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`flex items-center border-t border-slate-100 py-4 ${collapsed ? "flex-col gap-2 px-2" : "gap-3 px-4"}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B3C53] text-xs font-bold text-white">
          {user.prenom?.[0]}{user.nom?.[0]}
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-800">{user.nomComplet}</p>
            <p className="truncate text-[11px] text-slate-400">{user.role}</p>
          </div>
        )}
        <button onClick={logout} aria-label="Déconnexion" className={collapsed ? "" : "ml-auto"}>
          <LogOut className="h-4 w-4 shrink-0 text-slate-300 hover:text-red-400" />
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tooltip personnalisé recharts
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label, unit = "" }: {
  active?: boolean; payload?: { value: number; name?: string; color?: string }[]; label?: string; unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-[12px]">
      <p className="mb-2 font-semibold text-slate-700">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? COLORS[i] }} />
          <span className="text-slate-500">{p.name ?? "Valeur"} :</span>
          <span className="font-bold text-slate-800">{fmt(p.value)} {unit}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, unit, delta, deltaDir, icon: Icon, color }: {
  label: string; value: number; unit?: string; delta?: number; deltaDir?: "up" | "down";
  icon: ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" strokeWidth={2} />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-900">
        {fmt(value)}{unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
      </p>
      {delta !== undefined && (
        <p className={`mt-2 flex items-center gap-1 text-[12px] font-semibold ${deltaDir === "up" ? "text-emerald-600" : "text-red-500"}`}>
          {deltaDir === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {delta}%
          <span className="font-normal text-slate-400">vs période préc.</span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart card wrapper
// ---------------------------------------------------------------------------

function ChartCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tableau de données
// ---------------------------------------------------------------------------

function DataTable({ supports, limit = 10 }: { supports: SupportPublicitaire[]; limit?: number }) {
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof SupportPublicitaire>("dateCollecte");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = supports.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.marque?.toLowerCase().includes(q)
      || s.commune?.toLowerCase().includes(q)
      || s.typeSupport?.toLowerCase().includes(q)
      || s.entreprise?.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortField] ?? "";
    const bv = b[sortField] ?? "";
    const cmp = String(av).localeCompare(String(bv), "fr", { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / limit);
  const paged = sorted.slice(page * limit, (page + 1) * limit);

  function toggleSort(f: keyof SupportPublicitaire) {
    if (sortField === f) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("desc"); }
  }

  const Th = ({ field, label }: { field: keyof SupportPublicitaire; label: string }) => (
    <th
      onClick={() => toggleSort(field)}
      className="cursor-pointer select-none whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-[#0B3C53]"
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field && <span className="text-[#0B3C53]">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Rechercher dans les résultats..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
          />
        </div>
        <p className="text-[12px] text-slate-400">{sorted.length} supports</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <Th field="marque" label="Marque" />
              <Th field="commune" label="Commune" />
              <Th field="typeSupport" label="Type" />
              <Th field="etatSupport" label="État" />
              <Th field="surface" label="Surface (m²)" />
              <Th field="nombreSupport" label="Quantité" />
              <Th field="tsp" label="TSP (FCFA)" />
              <Th field="odpValue" label="ODP (FCFA)" />
              <Th field="dateCollecte" label="Collecté le" />
            </tr>
          </thead>
          <tbody>
            {paged.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{s.marque || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{s.commune || "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {s.typeSupport || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex h-2 w-2 rounded-full mr-1.5"
                    style={{ background: ETAT_COLORS[s.etatSupport ?? ""] ?? "#94a3b8" }} />
                  <span className="text-[13px] text-slate-600">{s.etatSupport || "—"}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{s.surface ? fmt(s.surface) : "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{s.nombreSupport ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{s.tsp ? fmt(s.tsp) : "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{s.odpValue ? fmt(s.odpValue) : "—"}</td>
                <td className="px-4 py-3 text-[12px] text-slate-400">
                  {s.dateCollecte ? formatDateFR(s.dateCollecte) : "—"}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-slate-400">Aucun support pour ces critères.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[12px] text-slate-400">Page {page + 1} / {totalPages}</p>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Préc.
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Suiv.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export utilities
// ---------------------------------------------------------------------------

function exportCSV(supports: SupportPublicitaire[], filename = "rapport-supports.csv") {
  const headers = ["ID", "Marque", "Entreprise", "Commune", "Région", "District", "Type support", "État", "Surface (m²)", "Nb supports", "Nb faces", "Surface ODP", "TSP (FCFA)", "ODP (FCFA)", "Canal", "Date collecte"];
  const rows = supports.map((s) => [
    s.id, s.marque, s.entreprise, s.commune, s.region, s.district,
    s.typeSupport, s.etatSupport, s.surface, s.nombreSupport, s.nombreFace,
    s.surfaceODP, s.tsp, s.odpValue, s.canal,
    s.dateCollecte ? formatDateFR(s.dateCollecte) : "",
  ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(supports: SupportPublicitaire[], filename = "rapport-supports.json") {
  const blob = new Blob([JSON.stringify(supports, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

type RapportType = "synthese" | "fiscal" | "terrain" | "comparatif";

export default function RapportsExportsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);

  const [supports, setSupports] = useState<SupportPublicitaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rapportType, setRapportType] = useState<RapportType>("synthese");
  const [showFilters, setShowFilters] = useState(false);
  const [activeSection, setActiveSection] = useState<"graphes" | "tableau">("graphes");

  // Filtres
  const [filters, setFilters] = useState<RapportFilters>({
    dateDebut: daysAgo(90),
    dateFin: today(),
    commune: "", region: "", district: "",
    typeSupport: "", etatSupport: "", entreprise: "", canal: "",
  });
  const [periodPreset, setPeriodPreset] = useState<number>(90);

  // Options de filtres (extraites des données)
  const [filterOptions, setFilterOptions] = useState({
    communes: [] as string[],
    regions: [] as string[],
    districts: [] as string[],
    typesSupport: [] as string[],
    etatsSupport: [] as string[],
    entreprises: [] as string[],
    canaux: [] as string[],
  });

  const [exportLoading, setExportLoading] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.entreprise) {
      apiFetch<Entreprise>(`/api/entreprises/${user.entreprise}/`)
        .then(setEntreprise).catch(() => {});
    }
  }, [user, router]);

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.dateDebut) params.set("date_debut", filters.dateDebut);
      if (filters.dateFin) params.set("date_fin", filters.dateFin);
      if (filters.commune) params.set("commune", filters.commune);
      if (filters.region) params.set("region", filters.region);
      if (filters.district) params.set("district", filters.district);
      if (filters.typeSupport) params.set("type_support", filters.typeSupport);
      if (filters.etatSupport) params.set("etat_support", filters.etatSupport);
      if (filters.entreprise) params.set("entreprise", filters.entreprise);
      if (filters.canal) params.set("canal", filters.canal);

      const data = await apiFetch<{ results?: SupportPublicitaire[] } | SupportPublicitaire[]>(
        `/api/supports/?${params.toString()}`
      );
      const list = Array.isArray(data) ? data : (data as { results: SupportPublicitaire[] }).results ?? [];
      setSupports(list);

      // Extraire les options de filtre des données reçues
      setFilterOptions({
        communes:    [...new Set(list.map((s) => s.commune).filter(Boolean))].sort(),
        regions:     [...new Set(list.map((s) => s.region).filter(Boolean))].sort(),
        districts:   [...new Set(list.map((s) => s.district).filter(Boolean))].sort(),
        typesSupport:[...new Set(list.map((s) => s.typeSupport).filter(Boolean))].sort(),
        etatsSupport:[...new Set(list.map((s) => s.etatSupport).filter(Boolean))].sort(),
        entreprises: [...new Set(list.map((s) => s.entreprise).filter(Boolean))].sort(),
        canaux:      [...new Set(list.map((s) => s.canal).filter(Boolean))].sort(),
      });
    } catch {
      setError("Impossible de charger les données. Vérifiez votre connexion.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  function applyPreset(days: number) {
    setPeriodPreset(days);
    setFilters((f) => ({ ...f, dateDebut: daysAgo(days), dateFin: today() }));
  }

  function resetFilters() {
    setFilters({ dateDebut: daysAgo(90), dateFin: today(), commune: "", region: "", district: "", typeSupport: "", etatSupport: "", entreprise: "", canal: "" });
    setPeriodPreset(90);
  }

  const hasActiveFilters = !!(filters.commune || filters.region || filters.district || filters.typeSupport || filters.etatSupport || filters.entreprise || filters.canal);
  const activeFilterCount = [filters.commune, filters.region, filters.district, filters.typeSupport, filters.etatSupport, filters.entreprise, filters.canal].filter(Boolean).length;

  // KPIs calculés
  const kpis: KpiRapport[] = [
    { id: "total", label: "Supports recensés", value: supports.length, delta: 12, deltaDir: "up", icon: Layers, color: "bg-violet-500" },
    { id: "tsp", label: "TSP total (FCFA)", value: supports.reduce((s, x) => s + (Number(x.tsp) || 0), 0), delta: 8, deltaDir: "up", icon: TrendingUp, color: "bg-cyan-500" },
    { id: "odp", label: "ODP total (FCFA)", value: supports.reduce((s, x) => s + (Number(x.odpValue) || 0), 0), delta: 5, deltaDir: "up", icon: TrendingUp, color: "bg-emerald-500" },
    { id: "fiscal", label: "Fiscalité totale (FCFA)", value: supports.reduce((s, x) => s + (Number(x.tsp) || 0) + (Number(x.odpValue) || 0), 0), delta: 10, deltaDir: "up", icon: BarChart2, color: "bg-blue-500" },
    { id: "communes", label: "Communes couvertes", value: new Set(supports.map((s) => s.commune)).size, delta: 3, deltaDir: "up", icon: MapPin, color: "bg-pink-500" },
    { id: "surface", label: "Surface totale (m²)", value: supports.reduce((s, x) => s + (Number(x.surface) || 0), 0), delta: 7, deltaDir: "up", icon: Layers, color: "bg-orange-500" },
  ] as (KpiRapport & { icon: ElementType; color: string })[];

  // Données graphiques
  const collecteParMois = aggregateByMonth(supports);
  const parCommune = aggregateByField(supports, "commune");
  const parType = aggregateByField(supports, "typeSupport");
  const parEtat = aggregateByField(supports, "etatSupport");
  const revenuParCommune = aggregateRevenu(supports);
  const radarData = buildRadarData(supports);
  const parRegion = aggregateByField(supports, "region");

  if (!user) return null;

  const RAPPORT_TYPES: { key: RapportType; label: string; icon: ElementType; desc: string }[] = [
    { key: "synthese", label: "Synthèse générale", icon: FilePieChart, desc: "Vue d'ensemble : collecte, types et géographie" },
    { key: "fiscal", label: "Analyse fiscale", icon: TrendingUp, desc: "TSP, ODP et projections fiscales" },
    { key: "terrain", label: "Rapport terrain", icon: MapPin, desc: "Couverture géographique et état des supports" },
    { key: "comparatif", label: "Comparatif", icon: BarChart2, desc: "Comparaison entre communes, régions, types" },
  ];

  const PERIODES = [
    { label: "7 j", days: 7 },
    { label: "30 j", days: 30 },
    { label: "90 j", days: 90 },
    { label: "6 mois", days: 180 },
    { label: "1 an", days: 365 },
  ];

  const FilterSelect = ({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void; options: string[];
  }) => (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-slate-400">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]">
        <option value="">Tous</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar desktop */}
      <aside className={`hidden flex-col border-r border-slate-200 bg-white transition-all duration-300 lg:flex ${sidebarCollapsed ? "w-16" : "w-64"} shrink-0`}>
        <SidebarContent user={user} entreprise={entreprise} logout={logout}
          collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((v) => !v)} />
      </aside>

      {/* Sidebar mobile */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent user={user} entreprise={entreprise} logout={logout} onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <button onClick={() => setSidebarCollapsed((v) => !v)} className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:block">
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Rapports & Exports</h2>
              <p className="hidden text-[12px] text-slate-400 sm:block">Analyse, visualisation et export des données</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} title="Actualiser"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-4">
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

        <main className="flex-1 px-4 py-6 sm:px-6" ref={printRef}>
          {/* Titre */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="border-l-4 border-[#0B3C53] pl-3">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Rapports & Exports</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                {supports.length} supports · période du {formatDateFR(filters.dateDebut)} au {formatDateFR(filters.dateFin)}
                {hasActiveFilters && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#0B3C53]/10 px-2 py-0.5 text-[11px] font-medium text-[#0B3C53]"><Filter className="h-3 w-3" />{activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""}</span>}
              </p>
            </div>
            {/* Actions export */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setExportLoading(true); setTimeout(() => { exportCSV(supports); setLastExport("CSV"); setExportLoading(false); }, 400); }}
                disabled={exportLoading || supports.length === 0}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                CSV
              </button>
              <button onClick={() => { setExportLoading(true); setTimeout(() => { exportJSON(supports); setLastExport("JSON"); setExportLoading(false); }, 400); }}
                disabled={exportLoading || supports.length === 0}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                <FileText className="h-4 w-4 text-blue-600" />
                JSON
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                <Printer className="h-4 w-4 text-slate-500" />
                Imprimer
              </button>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition ${showFilters || hasActiveFilters ? "border-[#0B3C53] bg-[#0B3C53]/5 text-[#0B3C53]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                <Filter className="h-4 w-4" />
                Filtres
                {hasActiveFilters && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0B3C53] text-[10px] font-bold text-white">{activeFilterCount}</span>}
              </button>
            </div>
          </div>

          {lastExport && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-[13px] font-medium text-emerald-700">Export {lastExport} téléchargé avec succès</p>
              <button onClick={() => setLastExport(null)} className="ml-auto text-emerald-500 hover:text-emerald-700"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Panneau filtres */}
          {showFilters && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-800">Filtres avancés</p>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && <button onClick={resetFilters} className="text-[12px] font-medium text-red-500 hover:underline">Réinitialiser</button>}
                  <button onClick={() => setShowFilters(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Période */}
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Période d'analyse</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PERIODES.map((p) => (
                    <button key={p.days} onClick={() => applyPreset(p.days)}
                      className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${periodPreset === p.days ? "bg-[#0B3C53] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <input type="date" value={filters.dateDebut}
                      onChange={(e) => { setPeriodPreset(0); setFilters((f) => ({ ...f, dateDebut: e.target.value })); }}
                      className="text-[13px] text-slate-700 outline-none" />
                    <span className="text-slate-400">→</span>
                    <input type="date" value={filters.dateFin}
                      onChange={(e) => { setPeriodPreset(0); setFilters((f) => ({ ...f, dateFin: e.target.value })); }}
                      className="text-[13px] text-slate-700 outline-none" />
                  </div>
                </div>
              </div>

              {/* Filtres géo + attributs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <FilterSelect label="District" value={filters.district} onChange={(v) => setFilters((f) => ({ ...f, district: v }))} options={filterOptions.districts} />
                <FilterSelect label="Région" value={filters.region} onChange={(v) => setFilters((f) => ({ ...f, region: v }))} options={filterOptions.regions} />
                <FilterSelect label="Commune" value={filters.commune} onChange={(v) => setFilters((f) => ({ ...f, commune: v }))} options={filterOptions.communes} />
                <FilterSelect label="Type de support" value={filters.typeSupport} onChange={(v) => setFilters((f) => ({ ...f, typeSupport: v }))} options={filterOptions.typesSupport} />
                <FilterSelect label="État du support" value={filters.etatSupport} onChange={(v) => setFilters((f) => ({ ...f, etatSupport: v }))} options={filterOptions.etatsSupport} />
                <FilterSelect label="Entreprise" value={filters.entreprise} onChange={(v) => setFilters((f) => ({ ...f, entreprise: v }))} options={filterOptions.entreprises} />
                <FilterSelect label="Canal" value={filters.canal} onChange={(v) => setFilters((f) => ({ ...f, canal: v }))} options={filterOptions.canaux} />
              </div>

              {/* Tags filtres actifs */}
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries({
                    District: filters.district, Région: filters.region, Commune: filters.commune,
                    Type: filters.typeSupport, État: filters.etatSupport,
                    Entreprise: filters.entreprise, Canal: filters.canal,
                  }).filter(([, v]) => v).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1 rounded-full bg-[#0B3C53]/10 px-2.5 py-1 text-[12px] font-medium text-[#0B3C53]">
                      {k} : {v}
                      <button onClick={() => {
                        const keyMap: Record<string, keyof RapportFilters> = { District: "district", Région: "region", Commune: "commune", Type: "typeSupport", État: "etatSupport", Entreprise: "entreprise", Canal: "canal" };
                        setFilters((f) => ({ ...f, [keyMap[k]]: "" }));
                      }}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Type de rapport */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RAPPORT_TYPES.map((rt) => {
              const Icon = rt.icon;
              return (
                <button key={rt.key} onClick={() => setRapportType(rt.key)}
                  className={`rounded-xl border p-4 text-left transition ${rapportType === rt.key ? "border-[#0B3C53] bg-[#0B3C53] text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  <Icon className={`mb-2 h-5 w-5 ${rapportType === rt.key ? "text-white" : "text-[#0B3C53]"}`} />
                  <p className={`text-[13px] font-bold ${rapportType === rt.key ? "text-white" : "text-slate-800"}`}>{rt.label}</p>
                  <p className={`mt-0.5 text-[11px] ${rapportType === rt.key ? "text-white/70" : "text-slate-400"}`}>{rt.desc}</p>
                </button>
              );
            })}
          </div>

          {/* États chargement / erreur */}
          {isLoading && (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" />
            </div>
          )}
          {error && !isLoading && (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-[14px] text-slate-600">{error}</p>
              <button onClick={load} className="rounded-lg bg-[#0B3C53] px-4 py-2 text-[13px] font-semibold text-white">Réessayer</button>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* KPI Cards */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {(kpis as (KpiRapport & { icon: ElementType; color: string })[]).map((k) => (
                  <KpiCard key={k.id} label={k.label} value={k.value} unit={k.unit}
                    delta={k.delta} deltaDir={k.deltaDir} icon={k.icon} color={k.color} />
                ))}
              </div>

              {/* Switch graphes / tableau */}
              <div className="mb-5 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
                <button onClick={() => setActiveSection("graphes")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${activeSection === "graphes" ? "bg-[#0B3C53] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
                  <BarChart2 className="h-4 w-4" />Graphiques
                </button>
                <button onClick={() => setActiveSection("tableau")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${activeSection === "tableau" ? "bg-[#0B3C53] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
                  <Eye className="h-4 w-4" />Données détaillées
                </button>
              </div>

              {/* === SECTION GRAPHIQUES === */}
              {activeSection === "graphes" && (
                <div className="space-y-6">

                  {/* RAPPORT SYNTHÈSE */}
                  {rapportType === "synthese" && (
                    <>
                      {/* Ligne 1 : évolution + répartition types */}
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <ChartCard title="Évolution des collectes" subtitle="Nombre de supports recensés par mois">
                          {collecteParMois.length === 0 ? (
                            <p className="py-8 text-center text-[13px] text-slate-400">Aucune donnée sur la période.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={240}>
                              <AreaChart data={collecteParMois}>
                                <defs>
                                  <linearGradient id="gradCollecte" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0B3C53" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#0B3C53" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip unit="supports" />} />
                                <Area type="monotone" dataKey="value" stroke="#0B3C53" strokeWidth={2.5} fill="url(#gradCollecte)" name="Supports" />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </ChartCard>

                        <ChartCard title="Répartition par type de support" subtitle="Top types en nombre de supports">
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={parType} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtM} />
                              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={110} />
                              <Tooltip content={<CustomTooltip unit="supports" />} />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Supports">
                                {parType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartCard>
                      </div>

                      {/* Ligne 2 : donut état + top communes */}
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <ChartCard title="État des supports" subtitle="Répartition par état">
                          <div className="flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie data={parEtat} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                                  {parEtat.map((entry, i) => (
                                    <Cell key={i} fill={ETAT_COLORS[entry.label] ?? COLORS[i % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip unit="supports" />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {parEtat.map((e) => (
                              <div key={e.label} className="flex items-center justify-between text-[12px]">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full" style={{ background: ETAT_COLORS[e.label] ?? "#94a3b8" }} />
                                  <span className="text-slate-600">{e.label}</span>
                                </div>
                                <span className="font-semibold text-slate-800">{fmt(e.value)}</span>
                              </div>
                            ))}
                          </div>
                        </ChartCard>

                        <ChartCard title="Top communes" subtitle="Par nombre de supports" action={
                          <Link href="/supports-publicitaires" className="flex items-center gap-1 text-[12px] font-medium text-[#0B3C53] hover:underline">
                            Voir tout <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        }>
                          <div className="space-y-2.5">
                            {parCommune.slice(0, 7).map((c, i) => (
                              <div key={c.label} className="flex items-center gap-3">
                                <span className="w-5 text-[11px] font-bold text-slate-400">#{i + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex items-center justify-between">
                                    <span className="truncate text-[12px] font-medium text-slate-700">{c.label}</span>
                                    <span className="ml-2 text-[12px] font-bold text-slate-800">{fmt(c.value)}</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                                    <div className="h-1.5 rounded-full bg-[#0B3C53]"
                                      style={{ width: `${(c.value / (parCommune[0]?.value || 1)) * 100}%` }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ChartCard>

                        <ChartCard title="Couverture radar" subtitle="Indicateurs de complétude">
                          <ResponsiveContainer width="100%" height={220}>
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar name="Couverture" dataKey="A" stroke="#0B3C53" fill="#0B3C53" fillOpacity={0.15} strokeWidth={2} />
                              <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </ChartCard>
                      </div>
                    </>
                  )}

                  {/* RAPPORT FISCAL */}
                  {rapportType === "fiscal" && (
                    <>
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <ChartCard title="TSP & ODP par commune" subtitle="Fiscalité détaillée (FCFA)">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={revenuParCommune}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={45} />
                              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtM} />
                              <Tooltip content={<CustomTooltip unit="FCFA" />} />
                              <Legend />
                              <Bar dataKey="value" name="TSP" fill="#0B3C53" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="secondValue" name="ODP" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Évolution des recettes" subtitle="TSP cumulé par mois">
                          {collecteParMois.length === 0 ? (
                            <p className="py-8 text-center text-[13px] text-slate-400">Aucune donnée disponible.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={280}>
                              <LineChart data={collecteParMois}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 4 }} name="Collectes" />
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </ChartCard>
                      </div>

                      {/* Tableau fiscal par commune */}
                      <ChartCard title="Tableau fiscal par commune" subtitle="TSP, ODP et total par zone géographique">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50">
                                {["Commune", "Nb supports", "Surface ODP (m²)", "TSP (FCFA)", "ODP (FCFA)", "Total (FCFA)"].map((h) => (
                                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {revenuParCommune.map((r) => (
                                <tr key={r.label} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="px-4 py-3 font-medium text-slate-800">{r.label}</td>
                                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                    {supports.filter((s) => s.commune === r.label).length}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                    {fmt(supports.filter((s) => s.commune === r.label).reduce((acc, s) => acc + (Number(s.surfaceODP) || 0), 0))}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums font-medium text-blue-700">{fmt(r.value)}</td>
                                  <td className="px-4 py-3 text-right tabular-nums font-medium text-cyan-700">{fmt(r.secondValue ?? 0)}</td>
                                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[#0B3C53]">
                                    {fmt(r.value + (r.secondValue ?? 0))}
                                  </td>
                                </tr>
                              ))}
                              {revenuParCommune.length === 0 && (
                                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Aucune donnée fiscale.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </ChartCard>
                    </>
                  )}

                  {/* RAPPORT TERRAIN */}
                  {rapportType === "terrain" && (
                    <>
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <ChartCard title="Couverture géographique" subtitle="Supports par région">
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={parRegion}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                              <Tooltip content={<CustomTooltip unit="supports" />} />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Supports">
                                {parRegion.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="État des supports terrain" subtitle="Répartition qualité">
                          <div className="flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={240}>
                              <PieChart>
                                <Pie data={parEtat} dataKey="value" nameKey="label" outerRadius={90} paddingAngle={2} stroke="none" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                                  {parEtat.map((entry, i) => (
                                    <Cell key={i} fill={ETAT_COLORS[entry.label] ?? COLORS[i % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartCard>
                      </div>

                      {/* Stats terrain */}
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[
                          { label: "Districts couverts", value: new Set(supports.map((s) => s.district)).size, icon: MapPin },
                          { label: "Régions actives", value: new Set(supports.map((s) => s.region)).size, icon: Layers },
                          { label: "Communes recensées", value: new Set(supports.map((s) => s.commune)).size, icon: MapPin },
                          { label: "Jours de collecte", value: new Set(supports.map((s) => s.dateCollecte?.slice(0, 10))).size, icon: Clock },
                        ].map((stat) => {
                          const Icon = stat.icon;
                          return (
                            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#0B3C53]/10">
                                <Icon className="h-5 w-5 text-[#0B3C53]" />
                              </div>
                              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                              <p className="mt-0.5 text-[12px] text-slate-400">{stat.label}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Timeline collecte */}
                      <ChartCard title="Activité de collecte dans le temps" subtitle="Supports recensés par mois">
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={collecteParMois}>
                            <defs>
                              <linearGradient id="gradTerrain" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip unit="supports" />} />
                            <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#gradTerrain)" name="Collectes" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </>
                  )}

                  {/* RAPPORT COMPARATIF */}
                  {rapportType === "comparatif" && (
                    <>
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <ChartCard title="Supports vs Fiscalité par commune" subtitle="Corrélation quantité / revenu fiscal">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={revenuParCommune}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} angle={-20} textAnchor="end" height={45} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtM} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                              <Tooltip content={<CustomTooltip unit="FCFA" />} />
                              <Legend />
                              <Bar yAxisId="left" dataKey="value" name="TSP (FCFA)" fill="#0B3C53" radius={[4, 4, 0, 0]} />
                              <Bar yAxisId="right" dataKey="secondValue" name="ODP (FCFA)" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Types de support par région" subtitle="Diversité des supports">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={parRegion}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                              <Tooltip content={<CustomTooltip unit="supports" />} />
                              <Bar dataKey="value" name="Supports" radius={[4, 4, 0, 0]}>
                                {parRegion.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartCard>
                      </div>

                      {/* Comparatif canaux */}
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <ChartCard title="Répartition par canal" subtitle="Canal de distribution">
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie data={aggregateByField(supports, "canal")} dataKey="value" nameKey="label"
                                innerRadius={50} outerRadius={85} paddingAngle={3} stroke="none">
                                {aggregateByField(supports, "canal").map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Score couverture radar" subtitle="Performance globale" >
                          <ResponsiveContainer width="100%" height={220}>
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar dataKey="A" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} strokeWidth={2} />
                              <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Surface ODP par type" subtitle="m² par catégorie de support">
                          <div className="space-y-3 pt-2">
                            {aggregateByField(supports, "typeSupport", "surfaceODP").slice(0, 6).map((item, i) => (
                              <div key={item.label} className="flex items-center gap-3">
                                <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="truncate text-[12px] text-slate-700">{item.label}</span>
                                    <span className="ml-2 text-[12px] font-bold text-slate-800">{fmtM(item.value)} m²</span>
                                  </div>
                                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                                    <div className="h-1.5 rounded-full" style={{ width: `${(item.value / (aggregateByField(supports, "typeSupport", "surfaceODP")[0]?.value || 1)) * 100}%`, background: COLORS[i % COLORS.length] }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* === SECTION TABLEAU === */}
              {activeSection === "tableau" && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-slate-800">Données détaillées</h3>
                    <div className="flex gap-2">
                      <button onClick={() => exportCSV(supports)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />Exporter CSV
                      </button>
                      <button onClick={() => exportJSON(supports)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                        <FileText className="h-4 w-4 text-blue-600" />Exporter JSON
                      </button>
                    </div>
                  </div>
                  <DataTable supports={supports} />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}