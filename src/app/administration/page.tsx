"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
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
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Building2,
  MapPin,
  SlidersHorizontal,
  Search,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Upload,
  Filter,
  Globe,
  ChevronRight,
  Tag,
  Handshake
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getAccessToken } from "@/lib/api/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://backend360.onrender.com";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Entreprise {
  id: number;
  nom: string;
  sigle: string;
  secteur: string;
  logo: string | null;
  is_active: boolean;
  cree_le: string;
}

interface Affectation {
  id: number;
  typeZone: string;
  valeurZone: string;
  estActive: boolean;
  district: number | null;
  region: number | null;
  commune: number | null;
  quartier: number | null;
  zone: number | null;
}

interface Utilisateur {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  nomComplet: string;
  telephone: string;
  entreprise: number | null;
  entrepriseNom: string | null;
  role: string;
  is_active: boolean;
  date_joined: string;
  affectations: Affectation[];
}

interface District {
  id: number;
  nom: string;
  code: string;
  is_active: boolean;
  cree_le: string;
  updated_at: string;
  taux_odp: string | null;
  taux_tsp: string | null;
  taux_ap: string | null;
  taux_apa: string | null;
  taux_apt: string | null;
  taux_ae: string | null;
  taux_aea: string | null;
  taux_aet: string | null;
}

interface Region {
  id: number;
  district: number;
  district_nom: string;
  nom: string;
  code: string;
  is_active: boolean;
  cree_le: string;
  updated_at: string;
  taux_odp: string | null;
  taux_tsp: string | null;
  taux_ap: string | null;
  taux_apa: string | null;
  taux_apt: string | null;
  taux_ae: string | null;
  taux_aea: string | null;
  taux_aet: string | null;
}

interface Commune {
  id: number;
  region: number;
  region_nom: string;
  district_nom: string;
  nom: string;
  code: string;
  is_active: boolean;
  cree_le: string;
  updated_at: string;
  taux_odp: string | null;
  taux_tsp: string | null;
  taux_ap: string | null;
  taux_apa: string | null;
  taux_apt: string | null;
  taux_ae: string | null;
  taux_aea: string | null;
  taux_aet: string | null;
}

interface Quartier {
  id: number;
  commune: number;
  commune_nom: string;
  nom: string;
  code: string;
  is_active: boolean;
  cree_le: string;
  updated_at: string;
}

interface Zone {
  id: number;
  quartier: number;
  quartier_nom: string;
  nom: string;
  code: string;
  is_active: boolean;
  cree_le: string;
  updated_at: string;
}

interface ParamSysteme {
  cle: string;
  label: string;
  valeur: string;
  description: string;
  type: "text" | "number" | "boolean" | "select";
  options?: string[];
}

// Référentiels publicitaires
interface SupportPublicitaire {
  id: number;
  entreprise: string;
  type_support: string;
  nombre_face: number | null;
  surface: number | null;
  create: string;
  updated_at: string;
}

interface Marque {
  id: number;
  entreprise: string;
  marque: string;
  surface: string;
  create: string;
  updated_at: string;
}

interface Canal {
  id: number;
  canal: string;
  create: string;
  updated_at: string;
}

interface Site {
  id: number;
  site: string;
  create: string;
  updated_at: string;
}

interface Etat {
  id: number;
  etat: string;
  create: string;
  updated_at: string;
}

interface Visibilite {
  id: number;
  visibilite: string;
  create: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ROLES = [
  { value: "SUPERADMIN", label: "SuperAdmin" },
  { value: "DG", label: "Direction G\u00e9n\u00e9rale" },
  { value: "FINANCE", label: "Finance" },
  { value: "JURIDIQUE", label: "Juridique" },
  { value: "MARKETING", label: "Marketing" },
  { value: "SUPERVISEUR", label: "Superviseur" },
  { value: "AGENT", label: "Agent recenseur" },
  { value: "PRESTATAIRE", label: "Prestataire" },
];

const ROLE_BADGE: Record<string, string> = {
  SUPERADMIN: "bg-violet-100 text-violet-700",
  DG: "bg-blue-100 text-blue-700",
  FINANCE: "bg-emerald-100 text-emerald-700",
  JURIDIQUE: "bg-amber-100 text-amber-700",
  MARKETING: "bg-pink-100 text-pink-700",
  SUPERVISEUR: "bg-cyan-100 text-cyan-700",
  AGENT: "bg-slate-100 text-slate-600",
  PRESTATAIRE: "bg-orange-100 text-orange-700",
};

const TAUX_LABELS: { key: keyof District; label: string; help: string }[] = [
  { key: "taux_odp", label: "ODP (%)", help: "Occupation du Domaine Public" },
  { key: "taux_tsp", label: "TSP (%)", help: "Taxe sur Support Publicitaire" },
  { key: "taux_ap",  label: "AP (%)",  help: "Affichage Publicitaire" },
  { key: "taux_apa", label: "APA (%)", help: "Affichage Publicitaire {\"Animé\"}" },
  { key: "taux_apt", label: "APT (%)", help: "Affichage Publicitaire Temporaire" },
  { key: "taux_ae",  label: "AE (%)",  help: "Affichage {\"Électronique\"}" },
  { key: "taux_aea", label: "AEA (%)", help: "Affichage {\"Électronique Animé\"}" },
  { key: "taux_aet", label: "AET (%)", help: "Affichage {\"Électronique\"} Temporaire" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function logoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}

async function fetchAll<T>(url: string): Promise<T[]> {
  const data = await apiFetch<{ results?: T[] } | T[]>(url);
  return Array.isArray(data) ? data : (data as { results: T[] }).results ?? [];
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
    label: "Operations",
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

const ACTIVE_HREF = "/administration";

// ---------------------------------------------------------------------------
// Composants UI
// ---------------------------------------------------------------------------

function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        className={`flex max-h-[90vh] w-full flex-col rounded-xl bg-white shadow-xl ${
          wide ? "max-w-3xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
          <Trash2 className="h-5 w-5 text-red-500" />
        </div>
        <h3 className="mb-1.5 text-[15px] font-bold text-slate-900">
          {"Confirmer la suppression"}
        </h3>
        <p className="mb-5 text-[13px] text-slate-500">
          <span className="font-medium text-slate-700">{label}</span>
          {" sera "}{"définitivement"}{" supprimé."}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function EntrepriseLogo({
  entreprise,
  size = "md",
}: {
  entreprise: { nom?: string; sigle?: string; logo?: string | null } | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-[11px]",
    lg: "h-12 w-12 text-sm",
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
        className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200`}
      />
    );
  }
  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-amber-400 font-bold text-white`}
    >
      {fallback}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function SidebarContent({
  user,
  entreprise,
  logout,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: {
  user: Utilisateur;
  entreprise: Entreprise | null;
  logout: () => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <>
      <div
        className={`flex items-center py-4 ${
          collapsed ? "flex-col gap-2 px-2" : "justify-between px-4"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B3C53]">
            <span className="text-base font-bold text-white">V</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-[15px] font-bold leading-tight text-slate-900">
                VisiTrack360
              </p>
              <p className="text-[11px] text-slate-400">{"Audit de Visibilité"}</p>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!collapsed ? (
        <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
          <EntrepriseLogo entreprise={entreprise} size="md" />
          <div className="min-w-0 leading-tight flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-800">
              {user.entrepriseNom ?? "Administration"}
            </p>
            <p className="text-[11px] text-slate-400">{"Compte entreprise"}</p>
          </div>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
        </div>
      ) : (
        <div className="mx-auto mb-3">
          <EntrepriseLogo entreprise={entreprise} size="sm" />
        </div>
      )}

      <nav
        className={`flex-1 space-y-5 overflow-y-auto pb-4 pt-2 ${
          collapsed ? "px-2" : "px-3"
        }`}
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.label}
              </p>
            )}
            {collapsed && <div className="my-2 h-px bg-slate-100" />}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = item.href === ACTIVE_HREF;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center rounded-lg py-2.5 text-[13px] font-medium transition-colors ${
                      collapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
                    } ${
                      isActive
                        ? "bg-[#0B3C53] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={`flex items-center border-t border-slate-100 py-4 ${
          collapsed ? "flex-col gap-2 px-2" : "gap-3 px-4"
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B3C53] text-xs font-bold text-white">
          {user.prenom?.[0]}
          {user.nom?.[0]}
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-800">
              {user.nomComplet}
            </p>
            <p className="truncate text-[11px] text-slate-400">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          aria-label="Déconnexion"
          className={collapsed ? "" : "ml-auto"}
        >
          <LogOut className="h-4 w-4 shrink-0 text-slate-300 hover:text-red-400" />
        </button>
      </div>
    </>
  );
}

type Tab = "utilisateurs" | "entreprises" | "geographie" | "referentiels" | "parametres";

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function AdministrationPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("utilisateurs");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SUPERADMIN") { router.replace("/dashboard-executif"); return; }
    if (user.entreprise) {
      apiFetch<Entreprise>(`/api/entreprises/${user.entreprise}/`)
        .then(setEntreprise)
        .catch(() => {});
    }
  }, [user, router]);

  if (!user || user.role !== "SUPERADMIN") return null;

  const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: "utilisateurs", label: "Utilisateurs",  icon: <Users className="h-4 w-4" /> },
    { key: "entreprises",  label: "Entreprises",   icon: <Building2 className="h-4 w-4" /> },
    { key: "geographie",   label: "Géographie",    icon: <Globe className="h-4 w-4" /> },
    { key: "referentiels", label: "Référentiels",  icon: <Tag className="h-4 w-4" /> },
    { key: "parametres",   label: "Paramètres",    icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`hidden flex-col border-r border-slate-200 bg-white transition-all duration-300 lg:flex ${
          sidebarCollapsed ? "w-16" : "w-64"
        } shrink-0`}
      >
        <SidebarContent
          user={user as unknown as Utilisateur}
          entreprise={entreprise}
          logout={logout}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          user={user as unknown as Utilisateur}
          entreprise={entreprise}
          logout={logout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:block"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Administration</h2>
              <p className="hidden text-[12px] text-slate-400 sm:block">
                {"Gestion des accès, entreprises et paramètres"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B3C53] text-sm font-bold text-white">
                {user.prenom?.[0]}
                {user.nom?.[0]}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-[13px] font-semibold text-slate-800">{user.nomComplet}</p>
                <p className="text-[11px] text-slate-400">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mb-6 border-l-4 border-[#0B3C53] pl-3">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Administration</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              {"Gérez les utilisateurs, les entreprises, la hiérarchie géographique et les paramètres."}
            </p>
          </div>

          <div className="mb-6 overflow-x-auto">
            <div className="flex w-max gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors sm:px-4 ${
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
          </div>

          {activeTab === "utilisateurs" && <UtilisateursTab />}
          {activeTab === "entreprises"  && <EntreprisesTab onEntrepriseUpdated={setEntreprise} />}
          {activeTab === "geographie"   && <GeographieTab />}
          {activeTab === "referentiels" && <ReferentielsTab />}
          {activeTab === "parametres"   && <ParametresTab />}
        </main>
      </div>
    </div>
  );
}

// ===========================================================================
// Onglet Utilisateurs
// ===========================================================================

function UtilisateursTab() {
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterEntreprise, setFilterEntreprise] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Utilisateur | null>(null);
  const [affectationModal, setAffectationModal] = useState<Utilisateur | null>(null);

  const [communes, setCommunes] = useState<Commune[]>([]);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  const [form, setForm] = useState({
    email: "", password: "", nom: "", prenom: "",
    telephone: "", entreprise: "", role: "AGENT",
  });

  const [affType, setAffType] = useState<"district" | "region" | "commune" | "quartier" | "zone">("commune");
  const [affValue, setAffValue] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, entData, distData, regData, comData, quarData, zoneData] = await Promise.all([
        fetchAll<Utilisateur>("/api/users/"),
        fetchAll<Entreprise>("/api/entreprises/"),
        fetchAll<District>("/api/geo/districts/"),
        fetchAll<Region>("/api/geo/regions/"),
        fetchAll<Commune>("/api/geo/communes/"),
        fetchAll<Quartier>("/api/geo/quartiers/"),
        fetchAll<Zone>("/api/geo/zones/"),
      ]);
      setUsers(usersData);
      setEntreprises(entData);
      setDistricts(distData);
      setRegions(regData);
      setCommunes(comData);
      setQuartiers(quarData);
      setZones(zoneData);
    } catch {
      setError("Impossible de charger les données.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingUser(null);
    setForm({ email: "", password: "", nom: "", prenom: "", telephone: "", entreprise: "", role: "AGENT" });
    setModalOpen(true);
  }

  function openEdit(u: Utilisateur) {
    setEditingUser(u);
    setForm({ email: u.email, password: "", nom: u.nom, prenom: u.prenom, telephone: u.telephone, entreprise: u.entreprise?.toString() ?? "", role: u.role });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        email: form.email, nom: form.nom, prenom: form.prenom,
        telephone: form.telephone, role: form.role,
        entreprise: form.entreprise ? parseInt(form.entreprise) : null,
      };
      if (form.password) payload.password = form.password;

      if (editingUser) {
        const updated = await apiFetch<Utilisateur>(`/api/users/${editingUser.id}/`, {
          method: "PATCH", body: JSON.stringify(payload),
        });
        setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
      } else {
        const created = await apiFetch<Utilisateur>("/api/users/", {
          method: "POST", body: JSON.stringify({ ...payload, password: form.password }),
        });
        setUsers((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch { alert("Erreur lors de la sauvegarde."); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/users/${deleteTarget.id}/`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { alert("Erreur lors de la suppression."); }
  }

  async function handleToggleActive(u: Utilisateur) {
    try {
      const updated = await apiFetch<Utilisateur>(`/api/users/${u.id}/`, {
        method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }),
      });
      setUsers((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch { alert("Erreur."); }
  }

  async function handleAddAffectation(e: FormEvent) {
    e.preventDefault();
    if (!affectationModal || !affValue) return;
    try {
      const payload: Record<string, unknown> = {
        agent: affectationModal.id,
        est_active: true,
        district: null, region: null, commune: null, quartier: null, zone: null,
      };
      payload[affType] = parseInt(affValue);
      await apiFetch("/api/affectations/", { method: "POST", body: JSON.stringify(payload) });
      setAffValue("");
      const updated = await apiFetch<Utilisateur>(`/api/users/${affectationModal.id}/`);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
      setAffectationModal(updated);
    } catch { alert("Erreur lors de l'ajout."); }
  }

  async function handleRemoveAffectation(affId: number) {
    if (!affectationModal) return;
    try {
      await apiFetch(`/api/affectations/${affId}/`, { method: "DELETE" });
      const updated = await apiFetch<Utilisateur>(`/api/users/${affectationModal.id}/`);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
      setAffectationModal(updated);
    } catch { alert("Erreur lors de la suppression."); }
  }

  function resetFilters() {
    setSearch(""); setFilterRole(""); setFilterEntreprise(""); setFilterStatut("");
  }

  const affOptions = useCallback((): { value: string; label: string }[] => {
    const empty = [{ value: "", label: "— Sélectionner —" }];
    if (affType === "district") return [...empty, ...districts.map((d) => ({ value: String(d.id), label: d.nom }))];
    if (affType === "region")   return [...empty, ...regions.map((r) => ({ value: String(r.id), label: `${r.nom} (${r.district_nom})` }))];
    if (affType === "commune")  return [...empty, ...communes.map((c) => ({ value: String(c.id), label: `${c.nom} (${c.region_nom})` }))];
    if (affType === "quartier") return [...empty, ...quartiers.map((q) => ({ value: String(q.id), label: `${q.nom} (${q.commune_nom})` }))];
    if (affType === "zone")     return [...empty, ...zones.map((z) => ({ value: String(z.id), label: `${z.nom} (${z.quartier_nom})` }))];
    return empty;
  }, [affType, districts, regions, communes, quartiers, zones]);

  const AFF_TYPES = [
    { value: "district", label: "District" },
    { value: "region",   label: "Région" },
    { value: "commune",  label: "Commune" },
    { value: "quartier", label: "Quartier" },
    { value: "zone",     label: "Zone" },
  ];

  const filtered = users.filter((u) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!u.nomComplet.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (filterRole && u.role !== filterRole) return false;
    if (filterEntreprise && String(u.entreprise) !== filterEntreprise) return false;
    if (filterStatut === "actif" && !u.is_active) return false;
    if (filterStatut === "inactif" && u.is_active) return false;
    return true;
  });

  const hasActiveFilters = !!(filterRole || filterEntreprise || filterStatut);

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition ${
                showFilters || hasActiveFilters
                  ? "border-[#0B3C53] bg-[#0B3C53]/5 text-[#0B3C53]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              Filtres
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0B3C53] text-[10px] font-bold text-white">
                  {[filterRole, filterEntreprise, filterStatut].filter(Boolean).length}
                </span>
              )}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90"
            >
              <Plus className="h-4 w-4" />
              Nouvel utilisateur
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
                Filtres avancés
              </p>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="text-[12px] font-medium text-[#0B3C53] hover:underline">
                  {"Réinitialiser"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">{"Rôle"}</label>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]">
                  <option value="">{"Tous les rôles"}</option>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">Entreprise</label>
                <select value={filterEntreprise} onChange={(e) => setFilterEntreprise(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]">
                  <option value="">{"Toutes les entreprises"}</option>
                  {entreprises.map((e) => <option key={e.id} value={String(e.id)}>{e.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">Statut</label>
                <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]">
                  <option value="">Tous</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-[13px] font-medium text-slate-500">
              {filtered.length} {"utilisateur"}{filtered.length > 1 ? "s" : ""}
              {hasActiveFilters && (
                <span className="ml-2 text-[12px] text-[#0B3C53]">
                  {"(filtré"}{filtered.length > 1 ? "s" : ""}{")" }
                </span>
              )}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Utilisateur</th>
                  <th className="px-3 py-2.5">{"Rôle"}</th>
                  <th className="px-3 py-2.5">Entreprise</th>
                  <th className="px-3 py-2.5">Affectations</th>
                  <th className="px-3 py-2.5">Statut</th>
                  <th className="px-3 py-2.5">{"Inscrit le"}</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const ent = entreprises.find((e) => e.id === u.entreprise) ?? null;
                  return (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800">{u.nomComplet}</p>
                        <p className="text-[12px] text-slate-400">{u.email}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ROLE_BADGE[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                          {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {ent ? (
                          <div className="flex items-center gap-2">
                            <EntrepriseLogo entreprise={ent} size="sm" />
                            <span className="text-[13px] text-slate-600">{ent.nom}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {u.affectations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.affectations.slice(0, 2).map((a) => (
                              <span key={a.id} className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-700">
                                {a.valeurZone}
                              </span>
                            ))}
                            {u.affectations.length > 2 && (
                              <span className="text-[11px] text-slate-400">+{u.affectations.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[12px] text-slate-300">Aucune</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <button onClick={() => handleToggleActive(u)} className="flex items-center gap-1.5">
                          {u.is_active ? (
                            <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-[12px] font-medium text-emerald-600">Actif</span></>
                          ) : (
                            <><XCircle className="h-4 w-4 text-slate-400" /><span className="text-[12px] font-medium text-slate-400">Inactif</span></>
                          )}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                        {formatDate(u.date_joined)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {u.role === "AGENT" && (
                            <button onClick={() => setAffectationModal(u)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600" title="Affectations">
                              <MapPin className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => openEdit(u)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(u)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      {"Aucun utilisateur trouvé."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal CRUD utilisateur */}
      {modalOpen && (
        <Modal
          title={editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button form="user-form" type="submit"
                className="rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white">
                {editingUser ? "Enregistrer" : "Créer"}
              </button>
            </>
          }
        >
          <form id="user-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prénom *">
              <Input value={form.prenom} onChange={(v) => setForm((f) => ({ ...f, prenom: v }))} required />
            </Field>
            <Field label="Nom *">
              <Input value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} required />
            </Field>
            <Field label="Email *">
              <Input type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
            </Field>
            <Field label={editingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe *"}>
              <Input type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} required={!editingUser} />
            </Field>
            <Field label="Téléphone">
              <Input value={form.telephone} onChange={(v) => setForm((f) => ({ ...f, telephone: v }))} />
            </Field>
            <Field label="Rôle *">
              <Select value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={ROLES} />
            </Field>
            <Field label="Entreprise">
              <Select
                value={form.entreprise}
                onChange={(v) => setForm((f) => ({ ...f, entreprise: v }))}
                options={[
                  { value: "", label: "— Aucune —" },
                  ...entreprises.map((e) => ({ value: e.id.toString(), label: e.nom })),
                ]}
              />
            </Field>
          </form>
        </Modal>
      )}

      {/* Modal affectations */}
      {affectationModal && (
        <Modal
          title={`Affectations — ${affectationModal.nomComplet}`}
          onClose={() => setAffectationModal(null)}
          footer={
            <button onClick={() => setAffectationModal(null)}
              className="rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white">
              Fermer
            </button>
          }
        >
          <div className="space-y-5">
            <div>
              <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">
                {"Zones assignées"}
              </h3>
              {affectationModal.affectations.length === 0 ? (
                <p className="text-[13px] text-slate-400">{"Aucune affectation."}</p>
              ) : (
                <div className="space-y-2">
                  {affectationModal.affectations.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-cyan-600" />
                        <span className="text-[13px] font-medium text-slate-700">{a.valeurZone}</span>
                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-600">{a.typeZone}</span>
                      </div>
                      <button onClick={() => handleRemoveAffectation(a.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">
                {"Ajouter une zone"}
              </h3>
              <form onSubmit={handleAddAffectation} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Niveau géographique">
                    <select
                      value={affType}
                      onChange={(e) => { setAffType(e.target.value as typeof affType); setAffValue(""); }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
                    >
                      {AFF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Valeur">
                    <select value={affValue} onChange={(e) => setAffValue(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]">
                      {affOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
                <button type="submit" disabled={!affValue}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          label={deleteTarget.nomComplet}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Onglet Entreprises
// ===========================================================================

function EntreprisesTab({ onEntrepriseUpdated }: { onEntrepriseUpdated?: (e: Entreprise) => void }) {
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnt, setEditingEnt] = useState<Entreprise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entreprise | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ nom: "", sigle: "", secteur: "", is_active: true });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setIsLoading(true);
    try {
      setEntreprises(await fetchAll<Entreprise>("/api/entreprises/"));
    } catch { setError("Impossible de charger les entreprises."); }
    finally { setIsLoading(false); }
  }

  function openCreate() {
    setEditingEnt(null);
    setForm({ nom: "", sigle: "", secteur: "", is_active: true });
    setLogoFile(null); setLogoPreview(null);
    setModalOpen(true);
  }

  function openEdit(e: Entreprise) {
    setEditingEnt(e);
    setForm({ nom: e.nom, sigle: e.sigle, secteur: e.secteur, is_active: e.is_active });
    setLogoFile(null); setLogoPreview(logoUrl(e.logo));
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let saved: Entreprise;
      if (logoFile) {
        const fd = new FormData();
        fd.append("nom", form.nom);
        fd.append("sigle", form.sigle);
        fd.append("secteur", form.secteur);
        fd.append("is_active", String(form.is_active));
        fd.append("logo", logoFile);
        const token = getAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const url = editingEnt
          ? `${BASE_URL}/api/entreprises/${editingEnt.id}/`
          : `${BASE_URL}/api/entreprises/`;
        const res = await fetch(url, { method: editingEnt ? "PATCH" : "POST", headers, body: fd });
        if (!res.ok) throw new Error("Erreur serveur");
        saved = await res.json();
      } else {
        if (editingEnt) {
          saved = await apiFetch<Entreprise>(`/api/entreprises/${editingEnt.id}/`, { method: "PATCH", body: JSON.stringify(form) });
        } else {
          saved = await apiFetch<Entreprise>("/api/entreprises/", { method: "POST", body: JSON.stringify(form) });
        }
      }
      setEntreprises((prev) =>
        editingEnt ? prev.map((x) => x.id === saved.id ? saved : x) : [saved, ...prev]
      );
      onEntrepriseUpdated?.(saved);
      setModalOpen(false);
    } catch { alert("Erreur lors de la sauvegarde."); }
    finally { setIsSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/entreprises/${deleteTarget.id}/`, { method: "DELETE" });
      setEntreprises((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { alert("Erreur lors de la suppression."); }
  }

  const filtered = entreprises.filter((e) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!e.nom.toLowerCase().includes(q) && !e.sigle.toLowerCase().includes(q)) return false;
    }
    if (filterStatut === "active" && !e.is_active) return false;
    if (filterStatut === "inactive" && e.is_active) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une entreprise..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]" />
        </div>
        <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]">
          <option value="">Toutes</option>
          <option value="active">Actives</option>
          <option value="inactive">Inactives</option>
        </select>
        <button onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90">
          <Plus className="h-4 w-4" />
          Nouvelle entreprise
        </button>
      </div>

      {isLoading && <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" /></div>}
      {error && <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3"><AlertCircle className="h-4 w-4 text-red-500" /><p className="text-[13px] text-red-700">{error}</p></div>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <EntrepriseLogo entreprise={e} size="lg" />
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(e)} className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteTarget(e)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <h3 className="text-[15px] font-bold text-slate-900">{e.nom}</h3>
              {e.sigle && <p className="text-[12px] font-medium text-slate-400">{e.sigle}</p>}
              {e.secteur && <p className="mt-1 text-[13px] text-slate-500">{e.secteur}</p>}
              <div className="mt-3 flex items-center gap-2">
                {e.is_active
                  ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Active</span>
                  : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">Inactive</span>}
                <span className="text-[11px] text-slate-400">{"Créée le"} {formatDate(e.cree_le)}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-400">{"Aucune entreprise trouvée."}</div>
          )}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingEnt ? "Modifier l'entreprise" : "Nouvelle entreprise"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
              <button form="ent-form" type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingEnt ? "Enregistrer" : "Créer"}
              </button>
            </>
          }
        >
          <form id="ent-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">
                {"Logo de l'entreprise"}
              </p>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-200">
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                      className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-slate-300">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                )}
                <div className="flex-1">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    {logoPreview ? "Changer le logo" : "Importer un logo"}
                  </button>
                  <p className="mt-1 text-[11px] text-slate-400">{"PNG, JPG recommandé · Format carré idéal"}</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nom *"><Input value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} required /></Field>
              </div>
              <Field label="Sigle"><Input value={form.sigle} onChange={(v) => setForm((f) => ({ ...f, sigle: v }))} placeholder="ex: MTN-CI" /></Field>
              <Field label="Secteur"><Input value={form.secteur} onChange={(v) => setForm((f) => ({ ...f, secteur: v }))} placeholder="ex: Télécommunications" /></Field>
              <div className="flex items-center gap-2 pt-1 sm:col-span-2">
                <button type="button" onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}>
                  {form.is_active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                </button>
                <span className="text-[13px] text-slate-600">Entreprise active</span>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal label={deleteTarget.nom} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

// ===========================================================================
// Onglet Géographie
// ===========================================================================

type GeoLevel = "districts" | "regions" | "communes" | "quartiers" | "zones";

const GEO_LEVELS: { key: GeoLevel; label: string; plural: string }[] = [
  { key: "districts", label: "District",  plural: "Districts"  },
  { key: "regions",   label: "Région",    plural: "Régions"    },
  { key: "communes",  label: "Commune",   plural: "Communes"   },
  { key: "quartiers", label: "Quartier",  plural: "Quartiers"  },
  { key: "zones",     label: "Zone",      plural: "Zones"      },
];

type GeoItem = District | Region | Commune | Quartier | Zone;

function parentLabel(level: GeoLevel, item: GeoItem): string {
  if (level === "regions")   return `District : ${(item as Region).district_nom}`;
  if (level === "communes")  return `Région : ${(item as Commune).region_nom}`;
  if (level === "quartiers") return `Commune : ${(item as Quartier).commune_nom}`;
  if (level === "zones")     return `Quartier : ${(item as Zone).quartier_nom}`;
  return "";
}

function GeographieTab() {
  const [level, setLevel] = useState<GeoLevel>("districts");
  const [items, setItems] = useState<GeoItem[]>([]);
  const [parents, setParents] = useState<GeoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GeoItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeoItem | null>(null);

  const [formNom, setFormNom] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formParent, setFormParent] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formTaux, setFormTaux] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasTaux = level === "districts" || level === "regions" || level === "communes";

  useEffect(() => { load(); }, [level]);

  async function load() {
    setIsLoading(true);
    setError(null);
    setSearch("");
    try {
      const data = await fetchAll<GeoItem>(`/api/geo/${level}/`);
      setItems(data);
      const parentEndpoint: Record<GeoLevel, string | null> = {
        districts: null,
        regions:   "/api/geo/districts/",
        communes:  "/api/geo/regions/",
        quartiers: "/api/geo/communes/",
        zones:     "/api/geo/quartiers/",
      };
      const pe = parentEndpoint[level];
      if (pe) setParents(await fetchAll<GeoItem>(pe));
      else setParents([]);
    } catch {
      setError("Impossible de charger les données.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingItem(null);
    setFormNom(""); setFormCode(""); setFormParent(""); setFormActive(true); setFormTaux({});
    setModalOpen(true);
  }

function openEdit(item: GeoItem) {
  setEditingItem(item);
  setFormNom(item.nom);
  setFormCode(item.code ?? "");
  setFormActive(item.is_active);
  const parentKey: Record<GeoLevel, string> = {
    districts: "",
    regions: String((item as Region).district ?? ""),
    communes: String((item as Commune).region ?? ""),
    quartiers: String((item as Quartier).commune ?? ""),
    zones: String((item as Zone).quartier ?? ""),
  };
  setFormParent(parentKey[level]);
  if (hasTaux) {
    const t: Record<string, string> = {};
    for (const { key } of TAUX_LABELS) {
      const value = (item as District)[key];
      t[key] = value != null ? String(value) : "";
    }
    setFormTaux(t);
  }
  setModalOpen(true);
}

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parentKey: Record<GeoLevel, string> = {
        districts: "",
        regions: "district",
        communes: "region",
        quartiers: "commune",
        zones: "quartier",
      };
      const payload: Record<string, unknown> = { nom: formNom, code: formCode, is_active: formActive };
      if (parentKey[level]) payload[parentKey[level]] = parseInt(formParent);
      if (hasTaux) {
        for (const { key } of TAUX_LABELS) {
          payload[key] = formTaux[key] ? parseFloat(formTaux[key]) : null;
        }
      }

      let saved: GeoItem;
      if (editingItem) {
        saved = await apiFetch<GeoItem>(`/api/geo/${level}/${editingItem.id}/`, { method: "PATCH", body: JSON.stringify(payload) });
        setItems((prev) => prev.map((x) => x.id === saved.id ? saved : x));
      } else {
        saved = await apiFetch<GeoItem>(`/api/geo/${level}/`, { method: "POST", body: JSON.stringify(payload) });
        setItems((prev) => [saved, ...prev]);
      }
      setModalOpen(false);
    } catch { alert("Erreur lors de la sauvegarde."); }
    finally { setIsSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/geo/${level}/${deleteTarget.id}/`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { alert("Impossible de supprimer — des éléments liés existent peut-être."); }
  }

  async function handleToggleActive(item: GeoItem) {
    try {
      const saved = await apiFetch<GeoItem>(`/api/geo/${level}/${item.id}/`, {
        method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }),
      });
      setItems((prev) => prev.map((x) => x.id === saved.id ? saved : x));
    } catch { alert("Erreur."); }
  }

  const parentOptions = [
    { value: "", label: "— Sélectionner —" },
    ...parents.map((p) => ({ value: String(p.id), label: p.nom })),
  ];

  const needsParent = level !== "districts";

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return item.nom.toLowerCase().includes(q) || (item.code ?? "").toLowerCase().includes(q);
  });

  const levelInfo = GEO_LEVELS.find((g) => g.key === level)!;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-1 text-[12px] text-slate-400">
        {GEO_LEVELS.map((g, i) => (
          <span key={g.key} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <button
              onClick={() => setLevel(g.key)}
              className={`rounded px-2 py-0.5 font-medium transition ${
                level === g.key ? "bg-[#0B3C53] text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {g.plural}
            </button>
          </span>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={`Rechercher un(e) ${levelInfo.label.toLowerCase()}…`}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]" />
        </div>
        <button onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90">
          <Plus className="h-4 w-4" />
          {`Nouveau ${levelInfo.label.toLowerCase()}`}
        </button>
      </div>

      {isLoading && <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" /></div>}
      {error && <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3"><AlertCircle className="h-4 w-4 text-red-500" /><p className="text-[13px] text-red-700">{error}</p></div>}

      {!isLoading && !error && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-[13px] font-medium text-slate-500">
              {filtered.length} {filtered.length > 1 ? levelInfo.plural.toLowerCase() : levelInfo.label.toLowerCase()}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Nom</th>
                  <th className="px-3 py-2.5">Code</th>
                  {needsParent && <th className="px-3 py-2.5">Rattachement</th>}
                  {hasTaux && <th className="px-3 py-2.5">TSP %</th>}
                  <th className="px-3 py-2.5">Statut</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-800">{item.nom}</td>
                    <td className="px-3 py-3 font-mono text-[12px] text-slate-400">{item.code || "—"}</td>
                    {needsParent && (
                      <td className="px-3 py-3 text-[13px] text-slate-500">{parentLabel(level, item)}</td>
                    )}
                    {hasTaux && (
                      <td className="px-3 py-3 text-[13px] text-slate-600">
                        {(item as District).taux_tsp != null
                          ? `${(item as District).taux_tsp} %`
                          : <span className="text-slate-300">{"Hérité"}</span>}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-3">
                      <button onClick={() => handleToggleActive(item)} className="flex items-center gap-1.5">
                        {item.is_active
                          ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-[12px] font-medium text-emerald-600">Actif</span></>
                          : <><XCircle className="h-4 w-4 text-slate-400" /><span className="text-[12px] font-medium text-slate-400">Inactif</span></>}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteTarget(item)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">{"Aucun résultat."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingItem ? `Modifier ${levelInfo.label.toLowerCase()}` : `Nouveau ${levelInfo.label.toLowerCase()}`}
          onClose={() => setModalOpen(false)}
          wide={hasTaux}
          footer={
            <>
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
              <button form="geo-form" type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingItem ? "Enregistrer" : "Créer"}
              </button>
            </>
          }
        >
          <form id="geo-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nom *">
                <Input value={formNom} onChange={setFormNom} required />
              </Field>
              <Field label="Code">
                <Input value={formCode} onChange={setFormCode} placeholder="ex: ABJ-01" />
              </Field>
              {needsParent && (
                <div className="sm:col-span-2">
                  <Field label={`${GEO_LEVELS[GEO_LEVELS.findIndex((g) => g.key === level) - 1]?.label ?? "Parent"} *`}>
                    <Select value={formParent} onChange={setFormParent} options={parentOptions} />
                  </Field>
                </div>
              )}
              <div className="flex items-center gap-2 sm:col-span-2">
                <button type="button" onClick={() => setFormActive((v) => !v)}>
                  {formActive ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                </button>
                <span className="text-[13px] text-slate-600">Actif</span>
              </div>
            </div>

            {hasTaux && (
              <div>
                <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">
                  {"Taux fiscaux (%) — laisser vide pour hériter du niveau supérieur"}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TAUX_LABELS.map(({ key, label, help }) => (
                    <div key={key}>
                      <label className="mb-1 block text-[11px] font-medium text-slate-500" title={help}>
                        {label}
                      </label>
                      <input
                        type="number" step="0.01" min="0" max="100"
                        value={formTaux[key] ?? ""}
                        onChange={(e) => setFormTaux((t) => ({ ...t, [key]: e.target.value }))}
                        placeholder="ex: 5.00"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          label={deleteTarget.nom}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Onglet Référentiels publicitaires
// ===========================================================================

type RefSection = "supports" | "marques" | "canaux" | "sites" | "etats" | "visibilites";

type RefItem = SupportPublicitaire | Marque | Canal | Site | Etat | Visibilite;

const REF_SECTIONS: {
  key: RefSection;
  label: string;
  plural: string;
  endpoint: string;
  color: string;
}[] = [
  { key: "supports",    label: "Type de support", plural: "Types de supports", endpoint: "/api/referentiels/supports/",    color: "bg-violet-50 text-violet-700 border-violet-100" },
  { key: "marques",     label: "Marque",           plural: "Marques",           endpoint: "/api/referentiels/marques/",     color: "bg-pink-50 text-pink-700 border-pink-100" },
  { key: "canaux",      label: "Canal",            plural: "Canaux",            endpoint: "/api/referentiels/canaux/",      color: "bg-cyan-50 text-cyan-700 border-cyan-100" },
  { key: "sites",       label: "Site",             plural: "Sites",             endpoint: "/api/referentiels/sites/",       color: "bg-amber-50 text-amber-700 border-amber-100" },
  { key: "etats",       label: "État",             plural: "États",             endpoint: "/api/referentiels/etats/",       color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { key: "visibilites", label: "Visibilité",       plural: "Visibilités",       endpoint: "/api/referentiels/visibilites/", color: "bg-blue-50 text-blue-700 border-blue-100" },
];

function getRefLabel(section: RefSection, item: RefItem): string {
  if (section === "supports")    return (item as SupportPublicitaire).type_support;
  if (section === "marques")     return (item as Marque).marque;
  if (section === "canaux")      return (item as Canal).canal;
  if (section === "sites")       return (item as Site).site;
  if (section === "etats")       return (item as Etat).etat;
  if (section === "visibilites") return (item as Visibilite).visibilite;
  return "—";
}

function getRefSubLabel(section: RefSection, item: RefItem): string | null {
  if (section === "supports") {
    const s = item as SupportPublicitaire;
    const parts: string[] = [];
    if (s.entreprise) parts.push(`Ent. : ${s.entreprise}`);
    if (s.nombre_face != null) parts.push(`${s.nombre_face} face(s)`);
    if (s.surface != null) parts.push(`${s.surface} m²`);
    return parts.join(" · ") || null;
  }
  if (section === "marques") {
    const m = item as Marque;
    const parts: string[] = [];
    if (m.entreprise) parts.push(`Ent. : ${m.entreprise}`);
    if (m.surface) parts.push(`${m.surface} m²`);
    return parts.join(" · ") || null;
  }
  return null;
}

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number";
  placeholder?: string;
  required?: boolean;
  colSpan?: "full";
};

function getRefFields(section: RefSection): FieldDef[] {
  switch (section) {
    case "supports":
      return [
        { key: "type_support", label: "Type de support *", type: "text", required: true, colSpan: "full", placeholder: "ex: Panneau 4×3" },
        { key: "entreprise",   label: "Entreprise",         type: "text", placeholder: "ex: Affichage Plus" },
        { key: "nombre_face",  label: "Nombre de faces",    type: "number", placeholder: "ex: 2" },
        { key: "surface",      label: "Surface (m²)",       type: "number", placeholder: "ex: 12.00" },
      ];
    case "marques":
      return [
        { key: "marque",     label: "Marque *",   type: "text", required: true, colSpan: "full", placeholder: "ex: MTN" },
        { key: "entreprise", label: "Entreprise", type: "text", placeholder: "ex: MTN-CI" },
        { key: "surface",    label: "Surface (m²)", type: "text", placeholder: "ex: 6.00" },
      ];
    case "canaux":
      return [{ key: "canal", label: "Canal *", type: "text", required: true, colSpan: "full", placeholder: "ex: Voie publique" }];
    case "sites":
      return [{ key: "site", label: "Site *", type: "text", required: true, colSpan: "full", placeholder: "ex: Zone industrielle" }];
    case "etats":
      return [{ key: "etat", label: "État *", type: "text", required: true, colSpan: "full", placeholder: "ex: Bon état" }];
    case "visibilites":
      return [{ key: "visibilite", label: "Visibilité *", type: "text", required: true, colSpan: "full", placeholder: "ex: Excellente" }];
  }
}

function ReferentielsTab() {
  const [section, setSection] = useState<RefSection>("supports");
  const [items, setItems] = useState<RefItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RefItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RefItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sectionMeta = REF_SECTIONS.find((s) => s.key === section)!;
  const fields = getRefFields(section);

  useEffect(() => { loadSection(); }, [section]);

  async function loadSection() {
    setIsLoading(true);
    setError(null);
    setSearch("");
    try {
      const data = await fetchAll<RefItem>(sectionMeta.endpoint);
      setItems(data);
    } catch {
      setError("Impossible de charger les données.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingItem(null);
    const blank: Record<string, string> = {};
    fields.forEach((f) => (blank[f.key] = ""));
    setForm(blank);
    setModalOpen(true);
  }

  function openEdit(item: RefItem) {
    setEditingItem(item);
    const filled: Record<string, string> = {};
    fields.forEach((f) => {
      const val = (item as unknown as Record<string, unknown>)[f.key];
      filled[f.key] = val != null ? String(val) : "";
    });
    setForm(filled);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (f.type === "number") {
          payload[f.key] = form[f.key] !== "" ? parseFloat(form[f.key]) : null;
        } else {
          payload[f.key] = form[f.key] ?? "";
        }
      });

      let saved: RefItem;
      if (editingItem) {
        saved = await apiFetch<RefItem>(`${sectionMeta.endpoint}${editingItem.id}/`, {
          method: "PATCH", body: JSON.stringify(payload),
        });
        setItems((prev) => prev.map((x) => x.id === saved.id ? saved : x));
      } else {
        saved = await apiFetch<RefItem>(sectionMeta.endpoint, {
          method: "POST", body: JSON.stringify(payload),
        });
        setItems((prev) => [saved, ...prev]);
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
      await apiFetch(`${sectionMeta.endpoint}${deleteTarget.id}/`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert("Impossible de supprimer — des éléments liés existent peut-être.");
    }
  }

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    return getRefLabel(section, item).toLowerCase().includes(search.toLowerCase());
  });

  const feminin = section === "etats" || section === "visibilites";

  return (
    <div>
      {/* Onglets de section */}
      <div className="mb-5 flex flex-wrap gap-2">
        {REF_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors ${
              section === s.key
                ? "border-[#0B3C53] bg-[#0B3C53] text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.plural}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Rechercher dans ${sectionMeta.plural.toLowerCase()}…`}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90"
        >
          <Plus className="h-4 w-4" />
          {feminin ? `Nouvelle ${sectionMeta.label.toLowerCase()}` : `Nouveau ${sectionMeta.label.toLowerCase()}`}
        </button>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="mb-3 text-[13px] font-medium text-slate-500">
            {filtered.length} {filtered.length > 1 ? sectionMeta.plural.toLowerCase() : sectionMeta.label.toLowerCase()}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const mainLabel = getRefLabel(section, item);
              const sub = getRefSubLabel(section, item);
              const dateVal = (item as unknown as Record<string, unknown>).create as string;
              return (
                <div
                  key={item.id}
                  className="group flex items-start justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm hover:border-slate-300 hover:shadow transition-shadow"
                >
                  <div className="min-w-0 flex-1">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sectionMeta.color}`}>
                      {sectionMeta.label}
                    </span>
                    <p className="mt-1.5 truncate text-[14px] font-semibold text-slate-800">{mainLabel}</p>
                    {sub && <p className="mt-0.5 truncate text-[12px] text-slate-400">{sub}</p>}
                    <p className="mt-1 text-[11px] text-slate-300">{formatDate(dateVal)}</p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => openEdit(item)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(item)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
                <p className="text-[14px] font-medium">
                  {feminin
                    ? `Aucune ${sectionMeta.label.toLowerCase()} trouvée.`
                    : `Aucun ${sectionMeta.label.toLowerCase()} trouvé.`}
                </p>
                <button onClick={openCreate} className="mt-3 text-[13px] font-medium text-[#0B3C53] hover:underline">
                  {feminin ? `+ En créer une` : `+ En créer un`}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal création / édition */}
      {modalOpen && (
        <Modal
          title={
            editingItem
              ? `Modifier ${sectionMeta.label.toLowerCase()}`
              : feminin
                ? `Nouvelle ${sectionMeta.label.toLowerCase()}`
                : `Nouveau ${sectionMeta.label.toLowerCase()}`
          }
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button form="ref-form" type="submit" disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingItem ? "Enregistrer" : "Créer"}
              </button>
            </>
          }
        >
          <form id="ref-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.colSpan === "full" ? "sm:col-span-2" : ""}>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-500">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  required={f.required}
                  step={f.type === "number" ? "0.01" : undefined}
                  min={f.type === "number" ? "0" : undefined}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
                />
              </div>
            ))}
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          label={getRefLabel(section, deleteTarget)}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Onglet Paramètres système
// ===========================================================================

const PARAMS_DEFAUT: ParamSysteme[] = [
  { cle: "taux_tsp_defaut", label: "Taux TSP par défaut (%)", valeur: "5", description: "Taux de Taxe sur Support Publicitaire appliqué par défaut si aucun taux spécifique n'est défini pour la commune.", type: "number" },
  { cle: "devise", label: "Devise", valeur: "FCFA", description: "Devise utilisée pour l'affichage des montants dans la plateforme.", type: "select", options: ["FCFA", "EUR", "USD"] },
  { cle: "pagination_defaut", label: "Éléments par page", valeur: "20", description: "Nombre de lignes affichées par défaut dans les tableaux.", type: "select", options: ["10", "20", "50", "100"] },
  { cle: "duree_session_heures", label: "Durée de session (heures)", valeur: "2", description: "Durée de validité du token JWT avant expiration automatique.", type: "number" },
  { cle: "seuil_alerte_gap", label: "Seuil d'alerte gap potentiel (%)", valeur: "20", description: "Si le gap entre montant réclamé et montant calculé dépasse ce seuil, une alerte est générée.", type: "number" },
  { cle: "notifications_actives", label: "Notifications actives", valeur: "true", description: "Active ou désactive les notifications en temps réel.", type: "boolean" },
  { cle: "mode_debug", label: "Mode debug", valeur: "false", description: "Active des logs supplémentaires. À désactiver en production.", type: "boolean" },
  { cle: "export_formats", label: "Format d'export par défaut", valeur: "CSV", description: "Format utilisé par défaut lors des exports de rapports.", type: "select", options: ["CSV", "Excel", "PDF"] },
];

function ParametresTab() {
  const [params, setParams] = useState<ParamSysteme[]>(PARAMS_DEFAUT);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");

  function handleChange(cle: string, valeur: string) {
    setParams((prev) => prev.map((p) => (p.cle === cle ? { ...p, valeur } : p)));
    setSaved(false);
  }

  const filtered = params.filter(
    (p) =>
      !search.trim() ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.cle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un paramètre..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]" />
        </div>
        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition ${
            saved ? "bg-emerald-500" : "bg-[#0B3C53] hover:bg-[#0B3C53]/90"
          }`}
        >
          {saved
            ? <><CheckCircle2 className="h-4 w-4" />{"Sauvegardé"}</>
            : <><SlidersHorizontal className="h-4 w-4" />{"Sauvegarder"}</>}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-[13px] font-medium text-slate-500">
            {filtered.length} {"paramètre"}{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((p) => (
            <div key={p.cle} className="flex flex-col gap-3 px-5 py-4 hover:bg-slate-50/50 sm:flex-row sm:items-start sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-slate-800">{p.label}</p>
                <p className="mt-0.5 text-[12px] text-slate-400">{p.description}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-300">{p.cle}</p>
              </div>
              <div className="w-full sm:w-48 sm:shrink-0">
                {p.type === "boolean" ? (
                  <button type="button" onClick={() => handleChange(p.cle, p.valeur === "true" ? "false" : "true")} className="flex items-center gap-2">
                    {p.valeur === "true"
                      ? <><ToggleRight className="h-6 w-6 text-emerald-500" /><span className="text-[13px] font-medium text-emerald-600">{"Activé"}</span></>
                      : <><ToggleLeft className="h-6 w-6 text-slate-400" /><span className="text-[13px] font-medium text-slate-400">{"Désactivé"}</span></>}
                  </button>
                ) : p.type === "select" ? (
                  <select value={p.valeur} onChange={(e) => handleChange(p.cle, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]">
                    {p.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={p.type} value={p.valeur} onChange={(e) => handleChange(p.cle, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[12px] text-slate-400">
        {"* Les paramètres système sont enregistrés localement. L'intégration API sera activée lors du sprint paramètres."}
      </p>
    </div>
  );
}