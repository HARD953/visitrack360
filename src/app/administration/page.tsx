"use client";

import {
  useState,
  useEffect,
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types locaux (correspondant au back DRF)
// ---------------------------------------------------------------------------

interface Entreprise {
  id: number;
  nom: string;
  sigle: string;
  secteur: string;
  is_active: boolean;
  cree_le: string;
}

interface Affectation {
  id: number;
  typeZone: string;
  valeurZone: string;
  estActive: boolean;
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

const ROLES = [
  { value: "SUPERADMIN", label: "SuperAdmin" },
  { value: "DG", label: "Direction Générale" },
  { value: "FINANCE", label: "Finance" },
  { value: "JURIDIQUE", label: "Juridique" },
  { value: "MARKETING", label: "Marketing" },
  { value: "SUPERVISEUR", label: "Superviseur" },
  { value: "AGENT", label: "Agent recenseur" },
  { value: "PRESTATAIRE", label: "Prestataire" },
];

const TYPES_ZONE = [
  { value: "QUARTIER", label: "Quartier" },
  { value: "COMMUNE", label: "Commune" },
  { value: "REGION", label: "Région" },
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

const ACTIVE_HREF = "/administration";

// ---------------------------------------------------------------------------
// Sous-composants UI réutilisables
// ---------------------------------------------------------------------------

function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
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
        <h3 className="mb-1.5 text-[15px] font-bold text-slate-900">Confirmer la suppression</h3>
        <p className="mb-5 text-[13px] text-slate-500">
          <span className="font-medium text-slate-700">{label}</span> sera
          définitivement supprimé.
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

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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

// ---------------------------------------------------------------------------
// Sidebar (composant extrait pour réutilisation desktop + mobile)
// ---------------------------------------------------------------------------

function SidebarContent({
  user,
  logout,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: {
  user: Utilisateur;
  logout: () => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <>
      {/* Logo + bouton toggle */}
      <div className={`flex items-center py-4 ${collapsed ? "flex-col gap-2 px-2" : "justify-between px-4"}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B3C53]">
            <span className="text-base font-bold text-white">V</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-[15px] font-bold leading-tight text-slate-900">
                VisiTrack360
              </p>
              <p className="text-[11px] text-slate-400">Audit de Visibilité</p>
            </div>
          )}
        </div>
        {/* Bouton toggle collapse — desktop */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label={collapsed ? "Afficher le menu" : "Réduire le menu"}
            title={collapsed ? "Afficher le menu" : "Réduire le menu"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
        {/* Bouton fermer — mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Compte entreprise */}
      {!collapsed ? (
        <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-white">
            {user.entrepriseNom?.slice(0, 3).toUpperCase() ?? "ADM"}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-800">
              {user.entrepriseNom ?? "Administration"}
            </p>
            <p className="text-[11px] text-slate-400">Compte entreprise</p>
          </div>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
        </div>
      ) : (
        <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-white">
          {user.entrepriseNom?.slice(0, 3).toUpperCase() ?? "ADM"}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto pb-4 pt-2 px-2">
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

      {/* Profil utilisateur */}
      <div className={`flex items-center border-t border-slate-100 py-4 ${collapsed ? "flex-col gap-2 px-2" : "gap-3 px-4"}`}>
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
          title="Déconnexion"
          className={collapsed ? "" : "ml-auto"}
        >
          <LogOut className="h-4 w-4 shrink-0 text-slate-300 hover:text-red-400" />
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Onglets
// ---------------------------------------------------------------------------

type Tab = "utilisateurs" | "entreprises" | "parametres";

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function AdministrationPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("utilisateurs");

  // État du sidebar mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // État collapse desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Fermer le sidebar si on redimensionne vers desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Bloquer le scroll du body quand le sidebar mobile est ouvert
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

  // Redirect si non connecté ou non SuperAdmin
  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "SUPERADMIN") {
      router.replace("/dashboard-executif");
    }
  }, [user, router]);

  if (!user || user.role !== "SUPERADMIN") return null;

  const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
    {
      key: "utilisateurs",
      label: "Utilisateurs",
      icon: <Users className="h-4 w-4" />,
    },
    {
      key: "entreprises",
      label: "Entreprises",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      key: "parametres",
      label: "Paramètres système",
      icon: <Settings className="h-4 w-4" />,
    },
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
        <SidebarContent
          user={user as unknown as Utilisateur}
          logout={logout}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </aside>

      {/* ===================== SIDEBAR MOBILE (drawer) ===================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu de navigation"
      >
        <SidebarContent
          user={user as unknown as Utilisateur}
          logout={logout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* ===================== MAIN ===================== */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Bouton hamburger — mobile uniquement */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            
            {/* Bouton toggle sidebar — desktop */}
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:block"
              aria-label={sidebarCollapsed ? "Afficher le menu" : "Masquer le menu"}
              title={sidebarCollapsed ? "Afficher le menu" : "Masquer le menu"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>

            <div>
              <h2 className="text-[15px] font-bold text-slate-900">
                Administration
              </h2>
              <p className="hidden text-[12px] text-slate-400 sm:block">
                Gestion des accès, entreprises et paramètres
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 sm:pl-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B3C53] text-sm font-bold text-white">
                {user.prenom?.[0]}
                {user.nom?.[0]}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-[13px] font-semibold text-slate-800">
                  {user.nomComplet}
                </p>
                <p className="text-[11px] text-slate-400">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENU */}
        <main className="flex-1 px-4 py-6 sm:px-6">
          {/* Titre */}
          <div className="mb-6 border-l-4 border-[#0B3C53] pl-3">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Administration
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Gérez les utilisateurs, les entreprises et les paramètres de la plateforme.
            </p>
          </div>

          {/* Onglets */}
          <div className="mb-6 w-full overflow-x-auto">
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

          {/* Contenu par onglet */}
          {activeTab === "utilisateurs" && <UtilisateursTab />}
          {activeTab === "entreprises" && <EntreprisesTab />}
          {activeTab === "parametres" && <ParametresTab />}
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

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Utilisateur | null>(null);

  // Affectation modal
  const [affectationModal, setAffectationModal] = useState<Utilisateur | null>(null);

  // Formulaire utilisateur
  const [form, setForm] = useState({
    email: "",
    password: "",
    nom: "",
    prenom: "",
    telephone: "",
    entreprise: "" as string,
    role: "AGENT",
  });

  // Formulaire affectation
  const [affForm, setAffForm] = useState({
    type_zone: "COMMUNE",
    valeur_zone: "",
  });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, entData] = await Promise.all([
        apiFetch<{ results?: Utilisateur[]; count?: number } | Utilisateur[]>("/api/users/"),
        apiFetch<{ results?: Entreprise[] } | Entreprise[]>("/api/entreprises/"),
      ]);
      const usersList = Array.isArray(usersData)
        ? usersData
        : (usersData as { results: Utilisateur[] }).results ?? [];
      const entList = Array.isArray(entData)
        ? entData
        : (entData as { results: Entreprise[] }).results ?? [];
      setUsers(usersList);
      setEntreprises(entList);
    } catch {
      setError("Impossible de charger les utilisateurs.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingUser(null);
    setForm({
      email: "",
      password: "",
      nom: "",
      prenom: "",
      telephone: "",
      entreprise: "",
      role: "AGENT",
    });
    setModalOpen(true);
  }

  function openEdit(u: Utilisateur) {
    setEditingUser(u);
    setForm({
      email: u.email,
      password: "",
      nom: u.nom,
      prenom: u.prenom,
      telephone: u.telephone,
      entreprise: u.entreprise?.toString() ?? "",
      role: u.role,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        email: form.email,
        nom: form.nom,
        prenom: form.prenom,
        telephone: form.telephone,
        role: form.role,
        entreprise: form.entreprise ? parseInt(form.entreprise) : null,
      };
      if (form.password) payload.password = form.password;

      if (editingUser) {
        const updated = await apiFetch<Utilisateur>(
          `/api/users/${editingUser.id}/`,
          { method: "PATCH", body: JSON.stringify(payload) }
        );
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await apiFetch<Utilisateur>("/api/users/", {
          method: "POST",
          body: JSON.stringify({ ...payload, password: form.password }),
        });
        setUsers((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch {
      alert("Erreur lors de la sauvegarde.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/users/${deleteTarget.id}/`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert("Erreur lors de la suppression.");
    }
  }

  async function handleToggleActive(u: Utilisateur) {
    try {
      const updated = await apiFetch<Utilisateur>(`/api/users/${u.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      alert("Erreur lors de la mise à jour.");
    }
  }

  async function handleAddAffectation(e: FormEvent) {
    e.preventDefault();
    if (!affectationModal) return;
    try {
      await apiFetch("/api/affectations/", {
        method: "POST",
        body: JSON.stringify({
          agent: affectationModal.id,
          type_zone: affForm.type_zone,
          valeur_zone: affForm.valeur_zone,
          est_active: true,
        }),
      });
      setAffForm({ type_zone: "COMMUNE", valeur_zone: "" });
      const updated = await apiFetch<Utilisateur>(`/api/users/${affectationModal.id}/`);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setAffectationModal(updated);
    } catch {
      alert("Erreur lors de l'ajout de l'affectation.");
    }
  }

  async function handleRemoveAffectation(affId: number) {
    if (!affectationModal) return;
    try {
      await apiFetch(`/api/affectations/${affId}/`, { method: "DELETE" });
      const updated = await apiFetch<Utilisateur>(`/api/users/${affectationModal.id}/`);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setAffectationModal(updated);
    } catch {
      alert("Erreur lors de la suppression.");
    }
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.nomComplet.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nouvel utilisateur
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
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-[13px] font-medium text-slate-500">
              {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Utilisateur</th>
                  <th className="px-3 py-2.5">Rôle</th>
                  <th className="px-3 py-2.5">Entreprise</th>
                  <th className="px-3 py-2.5">Affectations</th>
                  <th className="px-3 py-2.5">Statut</th>
                  <th className="px-3 py-2.5">Inscrit le</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">{u.nomComplet}</p>
                      <p className="text-[12px] text-slate-400">{u.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          ROLE_BADGE[u.role] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {u.entrepriseNom ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {u.affectations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.affectations.slice(0, 2).map((a) => (
                            <span
                              key={a.id}
                              className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-700"
                            >
                              {a.valeurZone}
                            </span>
                          ))}
                          {u.affectations.length > 2 && (
                            <span className="text-[11px] text-slate-400">
                              +{u.affectations.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-300">Aucune</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className="flex items-center gap-1.5"
                        title={u.is_active ? "Désactiver" : "Activer"}
                      >
                        {u.is_active ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-[12px] font-medium text-emerald-600">
                              Actif
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-slate-400" />
                            <span className="text-[12px] font-medium text-slate-400">
                              Inactif
                            </span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                      {formatDate(u.date_joined)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {u.role === "AGENT" && (
                          <button
                            onClick={() => setAffectationModal(u)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600"
                            title="Gérer les affectations"
                          >
                            <MapPin className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(u)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal créer / éditer utilisateur */}
      {modalOpen && (
        <Modal
          title={editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                form="user-form"
                type="submit"
                className="rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90"
              >
                {editingUser ? "Enregistrer" : "Créer"}
              </button>
            </>
          }
        >
          <form
            id="user-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Field label="Prénom *">
              <Input
                value={form.prenom}
                onChange={(v) => setForm((f) => ({ ...f, prenom: v }))}
                required
              />
            </Field>
            <Field label="Nom *">
              <Input
                value={form.nom}
                onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
                required
              />
            </Field>
            <Field label="Email *">
              <Input
                type="email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                required
              />
            </Field>
            <Field label={editingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe *"}>
              <Input
                type="password"
                value={form.password}
                onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                required={!editingUser}
              />
            </Field>
            <Field label="Téléphone">
              <Input
                value={form.telephone}
                onChange={(v) => setForm((f) => ({ ...f, telephone: v }))}
              />
            </Field>
            <Field label="Rôle *">
              <Select
                value={form.role}
                onChange={(v) => setForm((f) => ({ ...f, role: v }))}
                options={ROLES}
              />
            </Field>
            <Field label="Entreprise">
              <Select
                value={form.entreprise}
                onChange={(v) => setForm((f) => ({ ...f, entreprise: v }))}
                options={[
                  { value: "", label: "— Aucune —" },
                  ...entreprises.map((e) => ({
                    value: e.id.toString(),
                    label: e.nom,
                  })),
                ]}
              />
            </Field>
          </form>
        </Modal>
      )}

      {/* Modal affectations agent */}
      {affectationModal && (
        <Modal
          title={`Affectations — ${affectationModal.nomComplet}`}
          onClose={() => setAffectationModal(null)}
          footer={
            <button
              onClick={() => setAffectationModal(null)}
              className="rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              Fermer
            </button>
          }
        >
          <div className="space-y-5">
            {/* Liste des affectations existantes */}
            <div>
              <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">
                Zones assignées
              </h3>
              {affectationModal.affectations.length === 0 ? (
                <p className="text-[13px] text-slate-400">
                  Aucune affectation pour l&apos;instant.
                </p>
              ) : (
                <div className="space-y-2">
                  {affectationModal.affectations.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-cyan-600" />
                        <span className="text-[13px] font-medium text-slate-700">
                          {a.valeurZone}
                        </span>
                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-600">
                          {TYPES_ZONE.find((t) => t.value === a.typeZone)?.label ?? a.typeZone}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveAffectation(a.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ajouter une affectation */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">
                Ajouter une zone
              </h3>
              <form
                onSubmit={handleAddAffectation}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <Field label="Type de zone">
                    <Select
                      value={affForm.type_zone}
                      onChange={(v) =>
                        setAffForm((f) => ({ ...f, type_zone: v }))
                      }
                      options={TYPES_ZONE}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Valeur (quartier / commune / région)">
                    <Input
                      value={affForm.valeur_zone}
                      onChange={(v) =>
                        setAffForm((f) => ({ ...f, valeur_zone: v }))
                      }
                      placeholder="ex: Cocody"
                      required
                    />
                  </Field>
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-cyan-700 sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal suppression */}
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

function EntreprisesTab() {
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnt, setEditingEnt] = useState<Entreprise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entreprise | null>(null);

  const [form, setForm] = useState({
    nom: "",
    sigle: "",
    secteur: "",
    is_active: true,
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ results?: Entreprise[] } | Entreprise[]>(
        "/api/entreprises/"
      );
      const list = Array.isArray(data)
        ? data
        : (data as { results: Entreprise[] }).results ?? [];
      setEntreprises(list);
    } catch {
      setError("Impossible de charger les entreprises.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    setEditingEnt(null);
    setForm({ nom: "", sigle: "", secteur: "", is_active: true });
    setModalOpen(true);
  }

  function openEdit(e: Entreprise) {
    setEditingEnt(e);
    setForm({
      nom: e.nom,
      sigle: e.sigle,
      secteur: e.secteur,
      is_active: e.is_active,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editingEnt) {
        const updated = await apiFetch<Entreprise>(
          `/api/entreprises/${editingEnt.id}/`,
          { method: "PATCH", body: JSON.stringify(form) }
        );
        setEntreprises((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x))
        );
      } else {
        const created = await apiFetch<Entreprise>("/api/entreprises/", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setEntreprises((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch {
      alert("Erreur lors de la sauvegarde.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/entreprises/${deleteTarget.id}/`, {
        method: "DELETE",
      });
      setEntreprises((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert("Erreur lors de la suppression.");
    }
  }

  const filtered = entreprises.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.nom.toLowerCase().includes(q) || e.sigle.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une entreprise..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle entreprise
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B3C53]">
                  <span className="text-sm font-bold text-white">
                    {e.sigle?.slice(0, 3) || e.nom.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(e)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(e)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-[15px] font-bold text-slate-900">{e.nom}</h3>
              {e.secteur && (
                <p className="mt-1 text-[13px] text-slate-500">{e.secteur}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                {e.is_active ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                    Inactive
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  Créée le {formatDate(e.cree_le)}
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-400">
              Aucune entreprise trouvée.
            </div>
          )}
        </div>
      )}

      {/* Modal créer / éditer */}
      {modalOpen && (
        <Modal
          title={editingEnt ? "Modifier l'entreprise" : "Nouvelle entreprise"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                form="ent-form"
                type="submit"
                className="rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90"
              >
                {editingEnt ? "Enregistrer" : "Créer"}
              </button>
            </>
          }
        >
          <form
            id="ent-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Field label="Nom *">
                <Input
                  value={form.nom}
                  onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
                  required
                />
              </Field>
            </div>
            <Field label="Sigle">
              <Input
                value={form.sigle}
                onChange={(v) => setForm((f) => ({ ...f, sigle: v }))}
                placeholder="ex: MTN-CI"
              />
            </Field>
            <Field label="Secteur">
              <Input
                value={form.secteur}
                onChange={(v) => setForm((f) => ({ ...f, secteur: v }))}
                placeholder="ex: Télécommunications"
              />
            </Field>
            <div className="flex items-center gap-2 pt-1 sm:col-span-2">
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, is_active: !f.is_active }))
                }
              >
                {form.is_active ? (
                  <ToggleRight className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-slate-400" />
                )}
              </button>
              <span className="text-[13px] text-slate-600">
                Entreprise active
              </span>
            </div>
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
// Onglet Paramètres système
// ===========================================================================

interface ParamSysteme {
  cle: string;
  label: string;
  valeur: string;
  description: string;
  type: "text" | "number" | "boolean" | "select";
  options?: string[];
}

const PARAMS_DEFAUT: ParamSysteme[] = [
  {
    cle: "taux_tsp_defaut",
    label: "Taux TSP par défaut (%)",
    valeur: "5",
    description:
      "Taux de Taxe sur Support Publicitaire appliqué par défaut si aucun taux spécifique n'est défini pour la commune.",
    type: "number",
  },
  {
    cle: "devise",
    label: "Devise",
    valeur: "FCFA",
    description: "Devise utilisée pour l'affichage des montants dans la plateforme.",
    type: "select",
    options: ["FCFA", "EUR", "USD"],
  },
  {
    cle: "pagination_defaut",
    label: "Éléments par page",
    valeur: "20",
    description: "Nombre de lignes affichées par défaut dans les tableaux.",
    type: "select",
    options: ["10", "20", "50", "100"],
  },
  {
    cle: "duree_session_heures",
    label: "Durée de session (heures)",
    valeur: "2",
    description:
      "Durée de validité du token d'accès JWT avant expiration automatique.",
    type: "number",
  },
  {
    cle: "seuil_alerte_gap",
    label: "Seuil d'alerte gap potentiel (%)",
    valeur: "20",
    description:
      "Si le gap entre montant réclamé et montant calculé dépasse ce seuil, une alerte Élevée est générée.",
    type: "number",
  },
  {
    cle: "notifications_actives",
    label: "Notifications actives",
    valeur: "true",
    description: "Active ou désactive les notifications en temps réel.",
    type: "boolean",
  },
  {
    cle: "mode_debug",
    label: "Mode debug",
    valeur: "false",
    description:
      "Active des logs supplémentaires. À désactiver en production.",
    type: "boolean",
  },
  {
    cle: "export_formats",
    label: "Format d'export par défaut",
    valeur: "CSV",
    description: "Format utilisé par défaut lors des exports de rapports.",
    type: "select",
    options: ["CSV", "Excel", "PDF"],
  },
];

function ParametresTab() {
  const [params, setParams] = useState<ParamSysteme[]>(PARAMS_DEFAUT);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");

  function handleChange(cle: string, valeur: string) {
    setParams((prev) =>
      prev.map((p) => (p.cle === cle ? { ...p, valeur } : p))
    );
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const filtered = params.filter((p) => {
    if (!search.trim()) return true;
    return (
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.cle.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un paramètre..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
          />
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition ${
            saved
              ? "bg-emerald-500"
              : "bg-[#0B3C53] hover:bg-[#0B3C53]/90"
          }`}
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Sauvegardé
            </>
          ) : (
            <>
              <SlidersHorizontal className="h-4 w-4" />
              Sauvegarder
            </>
          )}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-[13px] font-medium text-slate-500">
            {filtered.length} paramètre{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((p) => (
            <div
              key={p.cle}
              className="flex flex-col gap-3 px-5 py-4 hover:bg-slate-50/50 sm:flex-row sm:items-start sm:gap-6"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-slate-800">
                  {p.label}
                </p>
                <p className="mt-0.5 text-[12px] text-slate-400">
                  {p.description}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-300">
                  {p.cle}
                </p>
              </div>
              <div className="w-full sm:w-48 sm:shrink-0">
                {p.type === "boolean" ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleChange(p.cle, p.valeur === "true" ? "false" : "true")
                    }
                    className="flex items-center gap-2"
                  >
                    {p.valeur === "true" ? (
                      <>
                        <ToggleRight className="h-6 w-6 text-emerald-500" />
                        <span className="text-[13px] font-medium text-emerald-600">
                          Activé
                        </span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-6 w-6 text-slate-400" />
                        <span className="text-[13px] font-medium text-slate-400">
                          Désactivé
                        </span>
                      </>
                    )}
                  </button>
                ) : p.type === "select" ? (
                  <select
                    value={p.valeur}
                    onChange={(e) => handleChange(p.cle, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
                  >
                    {p.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={p.type}
                    value={p.valeur}
                    onChange={(e) => handleChange(p.cle, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[12px] text-slate-400">
        * Les paramètres système sont enregistrés localement pour cette session.
        L&apos;intégration avec l&apos;API backend sera activée lors du sprint paramètres.
      </p>
    </div>
  );
}