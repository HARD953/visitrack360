"use client";

import type { ElementType, ReactNode } from "react";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
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
  Calendar,
  SlidersHorizontal,
  Trophy,
  MoreVertical,
  Info,
  CalendarClock,
  Mail,
  Phone,
  ImageOff,
  Copy,
  CloudRain,
  Ruler,
  Folder,
  Coins,
  Calculator,
  HandCoins,
  PiggyBank,
  Percent,
  LogOut,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Handshake,
  Download,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";
import { fetchDashboardNegociations } from "@/lib/api/dashboard";
import type {
  NegotiationsDashboardData,
  ActionType,
  ReadyArgument,
} from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Types CRUD
// ---------------------------------------------------------------------------

interface Negociation {
  id: number;
  commune: string;
  entreprise: string;
  entreprise_rel: number | null;
  montantInitial: number;
  montantRecalcule: number;
  montantNegocie: number | null;
  economie: number | null;
  nextAction: {
    type: "reunion" | "argumentaire" | "relance";
    label: string;
  } | null;
}

interface ArgumentairePret {
  id: number;
  iconKey: "absent" | "doublon" | "periode" | "surface";
  label: string;
  negociation: number;
}

interface PaginatedResponse<T> {
  count: number;
  results: T[];
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

function sevenDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
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

function actionIcon(type: ActionType | "reunion" | "argumentaire" | "relance") {
  switch (type) {
    case "reunion":      return <CalendarClock className="h-4 w-4" />;
    case "argumentaire": return <Mail className="h-4 w-4" />;
    case "relance":      return <Phone className="h-4 w-4" />;
  }
}

function actionIconClasses(type: ActionType | "reunion" | "argumentaire" | "relance"): string {
  switch (type) {
    case "reunion":      return "bg-cyan-50 text-cyan-600";
    case "argumentaire": return "bg-blue-50 text-blue-600";
    case "relance":      return "bg-violet-50 text-violet-600";
  }
}

function actionBadgeClass(type: "reunion" | "argumentaire" | "relance"): string {
  switch (type) {
    case "reunion":      return "bg-cyan-100 text-cyan-700";
    case "argumentaire": return "bg-blue-100 text-blue-700";
    case "relance":      return "bg-violet-100 text-violet-700";
  }
}

function tagClasses(color: "blue" | "orange"): string {
  return color === "blue" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";
}

function readyArgumentIcon(key: ReadyArgument["iconKey"] | ArgumentairePret["iconKey"]) {
  switch (key) {
    case "absent":  return <ImageOff className="h-4 w-4" />;
    case "doublon": return <Copy className="h-4 w-4" />;
    case "periode": return <CloudRain className="h-4 w-4" />;
    case "surface": return <Ruler className="h-4 w-4" />;
  }
}

function readyArgumentIconClasses(key: ReadyArgument["iconKey"] | ArgumentairePret["iconKey"]): string {
  switch (key) {
    case "absent":  return "bg-red-50 text-red-500";
    case "doublon": return "bg-amber-50 text-amber-500";
    case "periode": return "bg-pink-50 text-pink-500";
    case "surface": return "bg-violet-50 text-violet-500";
  }
}

const KPI_STYLES: Record<string, { icon: ElementType; badge: string }> = {
  "dossiers-ouverts":  { icon: Folder,     badge: "bg-violet-500" },
  "montant-initial":   { icon: Coins,      badge: "bg-cyan-500" },
  "montant-recalcule": { icon: Calculator, badge: "bg-blue-500" },
  "montant-negocie":   { icon: HandCoins,  badge: "bg-orange-500" },
  "economie-obtenue":  { icon: PiggyBank,  badge: "bg-emerald-500" },
  "taux-reduction":    { icon: Percent,    badge: "bg-pink-500" },
};

const TYPES_ACTION = [
  { value: "reunion",      label: "Réunion" },
  { value: "argumentaire", label: "Envoi d'argumentaire" },
  { value: "relance",      label: "Relance" },
];

const MOTIFS_ARGUMENTAIRE = [
  { value: "absent",  label: "Supports absents" },
  { value: "doublon", label: "Doublons" },
  { value: "periode", label: "Mauvaise période" },
  { value: "surface", label: "Mauvaise surface" },
];

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const NAV_SECTIONS = [
  {
    label: "Principal",
    items: [
      { label: "Vue Direction",   href: "/dashboard-executif", icon: ShieldCheck },
      { label: "Tableau de bord", href: "/tableau-de-bord",    icon: LayoutDashboard },
    ],
  },
  {
    label: "Opérations",
    items: [
      { label: "Supports publicitaires", href: "/supports-publicitaires", icon: ImageIcon },
      { label: "Carte des supports",     href: "/carte-des-supports",     icon: Map },
      { label: "Analyse fiscale",        href: "/analyse-fiscale",        icon: LineChartIcon },
      { label: "Ordres de recettes",     href: "/ordres-de-recettes",     icon: Receipt },
      { label: "Rapports & exports",     href: "/rapports-exports",       icon: FileBarChart },
      // { label: "Negociations fiscale",   href: "/negociations",           icon: Handshake },
    ],
  },
  {
    label: "Administration",
    items: [
      // { label: "Agents recenseurs", href: "/agents-recenseurs", icon: Users },
      // { label: "Paramètres",        href: "/parametres",        icon: Settings },
      { label: "Administration",    href: "/administration",    icon: ShieldCheck },
    ],
  },
];

const ACTIVE_HREF = "/tableau-de-bord";

// ---------------------------------------------------------------------------
// Sous-composants formulaire
// ---------------------------------------------------------------------------

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value, onChange, type = "text", placeholder = "", required = false,
}: {
  value: string | number | null;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53] focus:ring-1 focus:ring-[#0B3C53]/20"
    />
  );
}

function SelectInput({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function emptyForm() {
  return {
    commune: "",
    entreprise: "",
    montantInitial: "",
    montantRecalcule: "",
    montantNegocie: "",
    typeProchaineAction: "",
    dateProchaineAction: "",
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TableauDeBordPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // ---- état dashboard ----
  const [data, setData] = useState<NegotiationsDashboardData | null>(null);
  const [isDashLoading, setIsDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [periodFrom, setPeriodFrom] = useState(sevenDaysAgoISO());
  const [periodTo, setPeriodTo] = useState(todayISO());

  // ---- état CRUD négociations ----
  const [negociations, setNegociations] = useState<Negociation[]>([]);
  const [argumentaires, setArgumentaires] = useState<ArgumentairePret[]>([]);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Negociation | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [argModal, setArgModal] = useState<Negociation | null>(null);
  const [argForm, setArgForm] = useState({ motif: "absent" });
  const [deleteTarget, setDeleteTarget] = useState<Negociation | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  // ---- Chargement dashboard ----
  useEffect(() => {
    if (!user) return;
    setIsDashLoading(true);
    setDashError(null);
    fetchDashboardNegociations(periodFrom, periodTo)
      .then(setData)
      .catch(() => setDashError("Impossible de charger le tableau de bord. Vérifiez votre connexion."))
      .finally(() => setIsDashLoading(false));
  }, [user, periodFrom, periodTo]);

  // ---- Chargement négociations (pour CRUD + graphe) ----
  const loadNegociations = useCallback(async () => {
    if (!user) return;
    try {
      const [negData, argData] = await Promise.all([
        apiFetch<PaginatedResponse<Negociation> | Negociation[]>("/api/negociations/"),
        apiFetch<PaginatedResponse<ArgumentairePret> | ArgumentairePret[]>("/api/argumentaires/"),
      ]);
      setNegociations(Array.isArray(negData) ? negData : negData.results);
      setArgumentaires(Array.isArray(argData) ? argData : argData.results);
    } catch {
      // silencieux — le dashboard a son propre état d'erreur
    }
  }, [user]);

  useEffect(() => { loadNegociations(); }, [loadNegociations]);

  // ---- Données graphique économies par commune ----
  const chartData = useMemo(() =>
    negociations
      .filter((n) => n.economie && n.economie > 0)
      .slice(0, 8)
      .map((n) => ({
        commune: n.commune,
        initial: Math.round(n.montantInitial / 1_000_000),
        negocie: Math.round((n.montantNegocie ?? 0) / 1_000_000),
        economie: Math.round((n.economie ?? 0) / 1_000_000),
      })),
    [negociations]
  );

  // ---- Export CSV ----
  function handleExportCSV() {
    exportCSV(negociations.map((n) => ({
      Commune: n.commune,
      Entreprise: n.entreprise,
      "Montant initial (FCFA)": n.montantInitial,
      "Montant recalculé (FCFA)": n.montantRecalcule,
      "Montant négocié (FCFA)": n.montantNegocie ?? "",
      "Économie (FCFA)": n.economie ?? "",
      "Taux réduction (%)": n.montantInitial > 0 && n.montantNegocie
        ? Math.round((1 - n.montantNegocie / n.montantInitial) * 100) : "",
      "Prochaine action": n.nextAction?.label ?? "",
    })), "negociations");
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(n: Negociation) {
    setEditing(n);
    setForm({
      commune: n.commune,
      entreprise: n.entreprise,
      montantInitial: String(n.montantInitial),
      montantRecalcule: String(n.montantRecalcule),
      montantNegocie: n.montantNegocie ? String(n.montantNegocie) : "",
      typeProchaineAction: n.nextAction?.type ?? "",
      dateProchaineAction: "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        commune: form.commune,
        entreprise: form.entreprise,
        montantInitial: parseFloat(form.montantInitial) || 0,
        montantRecalcule: parseFloat(form.montantRecalcule) || 0,
        montantNegocie: form.montantNegocie ? parseFloat(form.montantNegocie) : null,
        type_prochaine_action: form.typeProchaineAction || null,
        date_prochaine_action: form.dateProchaineAction || null,
      };
      if (editing) {
        const updated = await apiFetch<Negociation>(`/api/negociations/${editing.id}/`, {
          method: "PATCH", body: JSON.stringify(payload),
        });
        setNegociations((prev) => prev.map((n) => n.id === updated.id ? updated : n));
      } else {
        const created = await apiFetch<Negociation>("/api/negociations/", {
          method: "POST", body: JSON.stringify(payload),
        });
        setNegociations((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch {
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/negociations/${deleteTarget.id}/`, { method: "DELETE" });
      setNegociations((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert("Erreur lors de la suppression.");
    }
  }

  async function handleAddArgumentaire(e: FormEvent) {
    e.preventDefault();
    if (!argModal) return;
    try {
      const created = await apiFetch<ArgumentairePret>("/api/argumentaires/", {
        method: "POST",
        body: JSON.stringify({ motif: argForm.motif, negociation: argModal.id }),
      });
      setArgumentaires((prev) => [...prev, created]);
      setArgForm({ motif: "absent" });
    } catch {
      alert("Erreur lors de l'ajout de l'argumentaire.");
    }
  }

  async function handleDeleteArgumentaire(id: number) {
    try {
      await apiFetch(`/api/argumentaires/${id}/`, { method: "DELETE" });
      setArgumentaires((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Erreur lors de la suppression.");
    }
  }

  const maxMonthlySaving = data
    ? Math.max(...data.monthlySavings.map((m) => m.amount), 1)
    : 1;

  if (!user) return null;

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
            <h2 className="text-[15px] font-bold text-slate-900">Dashboard Négociations &amp; Économies</h2>
            <p className="text-[12px] text-slate-400">Tableau de bord</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
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
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          {/* Titre + période + actions */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="border-l-4 border-[#0B3C53] pl-3">
              <h1 className="text-2xl font-bold text-slate-900">Dashboard Négociations &amp; Économies</h1>
              <p className="mt-1 text-[13px] text-slate-500">Suivi des dossiers fiscaux et économies obtenues</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] text-slate-600 shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="w-28 outline-none text-[13px]" />
                <span className="text-slate-400">→</span>
                <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="w-28 outline-none text-[13px]" />
              </div>
              <button onClick={handleExportCSV} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50">
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#0B3C53]/90">
                <Plus className="h-4 w-4" />
                Nouvelle négociation
              </button>
            </div>
          </div>

          {/* État chargement dashboard */}
          {isDashLoading && (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" />
            </div>
          )}

          {dashError && !isDashLoading && (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-[14px] text-slate-600">{dashError}</p>
              <button
                onClick={() => {
                  setIsDashLoading(true);
                  setDashError(null);
                  fetchDashboardNegociations(periodFrom, periodTo)
                    .then(setData)
                    .catch(() => setDashError("Impossible de charger le tableau de bord."))
                    .finally(() => setIsDashLoading(false));
                }}
                className="rounded-lg bg-[#0B3C53] px-4 py-2 text-[13px] font-semibold text-white"
              >
                Réessayer
              </button>
            </div>
          )}

          {data && !isDashLoading && (
            <>
              {/* KPI Cards */}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {data.kpis.map((kpi) => {
                  const style = KPI_STYLES[kpi.id];
                  const Icon = style?.icon ?? Folder;
                  return (
                    <div key={kpi.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-start justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{kpi.label}</p>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style?.badge ?? "bg-slate-400"}`}>
                          <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold tabular-nums text-slate-900">
                        {formatNumber(kpi.value)}
                        {kpi.unit && <span className="ml-1 text-sm font-medium text-slate-400">{kpi.unit}</span>}
                      </p>
                      <p className={`mt-2 flex items-center gap-1 text-[12px] font-semibold ${kpi.trend.direction === "up" ? "text-emerald-600" : "text-red-500"}`}>
                        {kpi.trend.direction === "up"
                          ? <TrendingUp className="h-3.5 w-3.5" />
                          : <TrendingDown className="h-3.5 w-3.5" />}
                        {kpi.trend.value}
                        {kpi.trend.value < 100 ? "%" : ""}
                        <span className="font-normal text-slate-400">{kpi.trend.comparedTo}</span>
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Grille principale */}
              <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Tableau dossiers */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                  <div className="mb-4 flex items-center gap-2">
                    <h2 className="text-[14px] font-bold text-slate-800">Dossiers de négociation</h2>
                    <Info className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  {data.negotiationFiles.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-slate-400">Aucun dossier sur cette période.</p>
                  ) : (
                    <div className="-mx-5 overflow-x-auto">
                      <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-2.5">Commune</th>
                            <th className="px-3 py-2.5">Montant initial</th>
                            <th className="px-3 py-2.5">Recalculé</th>
                            <th className="px-3 py-2.5">Négocié</th>
                            <th className="px-3 py-2.5">Économie</th>
                            <th className="px-3 py-2.5">Prochaine action</th>
                            <th className="px-3 py-2.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {data.negotiationFiles.map((file) => (
                            <tr key={file.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                              <td className="px-5 py-3 font-semibold text-slate-800">{file.commune}</td>
                              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatNumber(Number(file.montantInitial))} FCFA</td>
                              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatNumber(Number(file.montantRecalcule))} FCFA</td>
                              <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                                {file.montantNegocie ? `${formatNumber(Number(file.montantNegocie))} FCFA` : "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 font-bold text-emerald-600">
                                {file.economie ? `${formatNumber(Number(file.economie))} FCFA` : "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3">
                                {file.nextAction ? (
                                  <div className="flex items-center gap-2">
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${actionIconClasses(file.nextAction.type as ActionType)}`}>
                                      {actionIcon(file.nextAction.type as ActionType)}
                                    </span>
                                    <span className="text-slate-600">{file.nextAction.label}</span>
                                  </div>
                                ) : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      const neg = negociations.find((n) => String(n.id) === String(file.id));
                                      if (neg) setArgModal(neg);
                                    }}
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                                    title="Argumentaires"
                                  >
                                    <ImageOff className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const neg = negociations.find((n) => String(n.id) === String(file.id));
                                      if (neg) openEdit(neg);
                                    }}
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                    title="Modifier"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const neg = negociations.find((n) => String(n.id) === String(file.id));
                                      if (neg) setDeleteTarget(neg);
                                    }}
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Link href="/ordres-de-recettes" className="mt-4 inline-block text-[13px] font-semibold text-[#0B3C53] hover:underline">
                    Voir tous les dossiers →
                  </Link>
                </div>

                {/* Colonne droite */}
                <div className="flex flex-col gap-4 xl:col-span-1">
                  {/* Dossiers en cours */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <h2 className="text-[14px] font-bold text-slate-800">Dossiers en cours</h2>
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    {data.ongoingFiles.length === 0 ? (
                      <p className="text-[13px] text-slate-400">Aucun dossier en cours.</p>
                    ) : (
                      <div className="space-y-4">
                        {data.ongoingFiles.map((file) => (
                          <div key={file.id} className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                              <CalendarClock className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-slate-800">{file.commune}</p>
                              <p className="truncate text-[12px] text-slate-500">{file.nextAppointment}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${tagClasses(file.tag.color)}`}>
                              {file.tag.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="mt-4 text-[13px] font-semibold text-[#0B3C53] hover:underline">
                      Voir tous les dossiers en cours →
                    </button>
                  </div>

                  {/* Argumentaires prêts */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <h2 className="text-[14px] font-bold text-slate-800">Argumentaires prêts</h2>
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <div className="space-y-4">
                      {data.readyArguments.map((arg) => (
                        <div key={arg.id} className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${readyArgumentIconClasses(arg.iconKey)}`}>
                            {readyArgumentIcon(arg.iconKey)}
                          </div>
                          <span className="flex-1 text-[13px] font-medium text-slate-700">{arg.label}</span>
                          <span className="text-[13px] font-bold text-[#0B3C53]">{arg.count} dossiers</span>
                        </div>
                      ))}
                    </div>
                    <button className="mt-4 text-[13px] font-semibold text-[#0B3C53] hover:underline">
                      Voir tous les argumentaires →
                    </button>
                  </div>
                </div>
              </div>

              {/* Économies mensuelles + graphe par commune + Performance */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Économies mensuelles */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[14px] font-bold text-slate-800">Économies mensuelles (FCFA)</h2>
                    <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50">
                      FCFA <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.monthlySavings} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `${v / 1_000_000}M`}
                        domain={[0, Math.ceil(maxMonthlySaving / 10_000_000) * 10_000_000 || 10_000_000]}
                      />
                      <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(value) => [`${formatNumber(Number(value))} FCFA`, "Économie"]} />
                      <Bar dataKey="amount" fill="#0B3C53" radius={[4, 4, 0, 0]} barSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Link href="/analyse-fiscale" className="mt-2 inline-block text-[13px] font-semibold text-[#0B3C53] hover:underline">
                    Voir l&apos;analyse complète →
                  </Link>
                </div>

                {/* Graphe économies par commune (depuis CRUD) */}
                {chartData.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
                    <h2 className="mb-4 text-[14px] font-bold text-slate-800">Économies par commune (M FCFA)</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="commune" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
                        <Tooltip formatter={(v) => [`${v}M FCFA`]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="initial"  name="Initial"  fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="negocie"  name="Négocié"  fill="#3B82F6" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="economie" name="Économie" fill="#10B981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Performance */}
                <div className="flex flex-col justify-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-[#0B3C53] to-[#0E4F66] p-6 text-white shadow-sm xl:col-span-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-[14px] font-bold">Performance</h2>
                  </div>
                  <p className="text-[13px] leading-relaxed text-white/80">
                    Les négociations menées sur la période ont permis une réduction moyenne de
                  </p>
                  <p className="text-4xl font-bold">{data.performance.averageReductionPercent} %</p>
                  <p className="text-[13px] text-white/70">
                    soit {formatNumber(data.performance.totalSavingsAmount)} FCFA d&apos;économies obtenues.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ===================== MODAL CRUD ===================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[16px] font-bold text-slate-900">
                {editing ? "Modifier la négociation" : "Nouvelle négociation"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form id="neg-form" onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Identification</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Commune *">
                    <TextInput value={form.commune} onChange={(v) => setForm((f) => ({ ...f, commune: v }))} required placeholder="ex: Plateau" />
                  </FormField>
                  <FormField label="Entreprise">
                    <TextInput value={form.entreprise} onChange={(v) => setForm((f) => ({ ...f, entreprise: v }))} placeholder="ex: MTN-CI" />
                  </FormField>
                </div>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Montants (FCFA)</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Montant initial *">
                    <TextInput type="number" value={form.montantInitial} onChange={(v) => setForm((f) => ({ ...f, montantInitial: v }))} required placeholder="ex: 5000000" />
                  </FormField>
                  <FormField label="Montant recalculé *">
                    <TextInput type="number" value={form.montantRecalcule} onChange={(v) => setForm((f) => ({ ...f, montantRecalcule: v }))} required placeholder="ex: 4200000" />
                  </FormField>
                  <FormField label="Montant négocié">
                    <TextInput type="number" value={form.montantNegocie} onChange={(v) => setForm((f) => ({ ...f, montantNegocie: v }))} placeholder="ex: 3800000" />
                  </FormField>
                </div>
                {form.montantInitial && form.montantNegocie && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5">
                    <span className="text-[13px] text-emerald-700">Économie estimée</span>
                    <span className="text-[14px] font-bold text-emerald-700">
                      {formatNumber(parseFloat(form.montantInitial) - parseFloat(form.montantNegocie))} FCFA
                      <span className="ml-1 font-normal text-emerald-600">
                        ({Math.round((1 - parseFloat(form.montantNegocie) / parseFloat(form.montantInitial)) * 100)}%)
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Prochaine action</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Type d'action">
                    <SelectInput value={form.typeProchaineAction} onChange={(v) => setForm((f) => ({ ...f, typeProchaineAction: v }))} options={TYPES_ACTION} placeholder="— Aucune —" />
                  </FormField>
                  <FormField label="Date prévue">
                    <TextInput type="datetime-local" value={form.dateProchaineAction} onChange={(v) => setForm((f) => ({ ...f, dateProchaineAction: v }))} />
                  </FormField>
                </div>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button form="neg-form" type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL ARGUMENTAIRES ===================== */}
      {argModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-[16px] font-bold text-slate-900">Argumentaires</h2>
                <p className="text-[12px] text-slate-400">{argModal.commune}</p>
              </div>
              <button onClick={() => setArgModal(null)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">Argumentaires enregistrés</h3>
                {argumentaires.filter((a) => a.negociation === argModal.id).length === 0 ? (
                  <p className="text-[13px] text-slate-400">Aucun argumentaire pour ce dossier.</p>
                ) : (
                  <div className="space-y-2">
                    {argumentaires.filter((a) => a.negociation === argModal.id).map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${readyArgumentIconClasses(a.iconKey)}`}>
                            {readyArgumentIcon(a.iconKey)}
                          </div>
                          <span className="text-[13px] font-medium text-slate-700">{a.label}</span>
                        </div>
                        <button onClick={() => handleDeleteArgumentaire(a.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">Ajouter un motif</h3>
                <form onSubmit={handleAddArgumentaire} className="flex items-end gap-3">
                  <div className="flex-1">
                    <SelectInput value={argForm.motif} onChange={(v) => setArgForm({ motif: v })} options={MOTIFS_ARGUMENTAIRE} />
                  </div>
                  <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-[#0B3C53] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90">
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </button>
                </form>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button onClick={() => setArgModal(null)} className="rounded-lg bg-[#0B3C53] px-4 py-2 text-[13px] font-semibold text-white">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL SUPPRESSION ===================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="mb-1.5 text-[15px] font-bold text-slate-900">Supprimer ce dossier ?</h3>
            <p className="mb-5 text-[13px] text-slate-500">
              La négociation de <span className="font-medium text-slate-700">{deleteTarget.commune}</span> sera définitivement supprimée.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}