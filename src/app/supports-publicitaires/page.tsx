"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
  type FormEvent,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
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
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  List,
  MapPin,
  Boxes,
  Camera,
  Upload,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getAccessToken } from "@/lib/api/client";
import type { SupportPublicitaire, EtatSupport, Canal, Visibilite } from "@/types/dashboard";
// ---------------------------------------------------------------------------
// Leaflet chargé dynamiquement (contrainte SSR)
// ---------------------------------------------------------------------------

const SupportsMap = dynamic(() => import("@/components/SupportsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Chargement de la carte…
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://backend360.onrender.com";

interface Support {
  id: number;
  marque: string;
  entreprise: string;
  entreprise_rel: number | null;
  agent: number | null;
  agentNom: string | null;
  ville: string;
  commune: string;
  region: string;
  district: string;
  village: string;
  quartier: string;
  nomSite: string;
  latitude: number | null;
  longitude: number | null;
  typeSupport: string;
  surface: number | null;
  nombreSupport: number | null;
  nombreFace: number | null;
  surfaceODP: number | null;
  canal: string;
  etatSupport: string;
  typeSite: string;
  visibilite: string;
  description: string;
  observation: string;
  responsableNom: string;
  responsablePrenom: string;
  responsableContact: string;
  signataireNom: string;
  signatairePrenom: string;
  signataireContact: string;
  duree: number | null;
  anciennete: boolean;
  tsp: number | null;
  odp: boolean;
  odpValue: number | null;
  ap: boolean;
  apa: boolean;
  apt: boolean;
  ae: boolean;
  aea: boolean;
  aet: boolean;
  tauxCommune: boolean;
  tauxRegion: boolean;
  tauxDistrict: boolean;
  imageSupport: string | null;
  imageSupportSecondaire: string | null;
  dateCollecte: string;
  updatedAt: string;
  isDeleted: boolean;
}

interface FiltresDisponibles {
  communes: string[];
  typesSupport: string[];
  canaux: string[];
  etatsSupport: string[];
  visibilites: string[];
  agents: { id: number; nomComplet: string }[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

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

function formatNumber(v: number): string {
  return new Intl.NumberFormat("fr-FR").format(v);
}

const ETAT_BADGE: Record<string, string> = {
  Bon: "bg-emerald-100 text-emerald-700",
  Défraichi: "bg-amber-100 text-amber-700",
  Détérioré: "bg-red-100 text-red-700",
};

const ETAT_DOT: Record<string, string> = {
  Bon: "bg-emerald-500",
  Défraichi: "bg-amber-500",
  Détérioré: "bg-red-500",
};

const VISIBILITE_BADGE: Record<string, string> = {
  Excellente: "bg-blue-100 text-blue-700",
  Bonne: "bg-cyan-100 text-cyan-700",
  Moyenne: "bg-slate-100 text-slate-600",
  Faible: "bg-orange-100 text-orange-700",
};

// Image URL absolue depuis le back
function imageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}

// ---------------------------------------------------------------------------
// Formulaire vide par défaut
// ---------------------------------------------------------------------------

function emptyForm(): Partial<Support> & {
  imageSupportFile: File | null;
  imageSupportSecondaireFile: File | null;
} {
  return {
    marque: "",
    entreprise: "",
    ville: "Abidjan",
    commune: "",
    region: "Abidjan",
    district: "Abidjan",
    village: "Abidjan",
    quartier: "",
    nomSite: "",
    latitude: null,
    longitude: null,
    typeSupport: "",
    surface: null,
    nombreSupport: null,
    nombreFace: null,
    surfaceODP: null,
    canal: "",
    etatSupport: "Bon",
    typeSite: "",
    visibilite: "Bonne",
    description: "",
    observation: "",
    responsableNom: "",
    responsablePrenom: "",
    responsableContact: "",
    signataireNom: "",
    signatairePrenom: "",
    signataireContact: "",
    duree: null,
    anciennete: false,
    tsp: null,
    odp: false,
    odpValue: null,
    ap: false,
    apa: false,
    apt: false,
    ae: false,
    aea: false,
    aet: false,
    tauxCommune: false,
    tauxRegion: false,
    tauxDistrict: false,
    imageSupportFile: null,
    imageSupportSecondaireFile: null,
  };
}

// ---------------------------------------------------------------------------
// Navigation (dupliquée volontairement)
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

const ACTIVE_HREF = "/supports-publicitaires";

// ---------------------------------------------------------------------------
// Sous-composants UI
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
      {children}
    </h3>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  value: string | number | null;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53] focus:ring-1 focus:ring-[#0B3C53]/20"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
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
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-[#0B3C53]"
      />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Composant Upload image avec aperçu + caméra
// ---------------------------------------------------------------------------

function ImageUploadField({
  label,
  currentUrl,
  onFileSelect,
}: {
  label: string;
  currentUrl: string | null;
  onFileSelect: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setPreview(URL.createObjectURL(file));
      onFileSelect(file);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch {
      alert("Impossible d'accéder à la caméra.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      setPreview(URL.createObjectURL(file));
      onFileSelect(file);
      stopCamera();
    }, "image/jpeg");
  }

  function clearImage() {
    setPreview(null);
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-slate-500">
        {label}
      </label>

      {showCamera ? (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full object-cover"
            style={{ maxHeight: 240 }}
          />
          <div className="flex gap-2 bg-slate-900 p-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white py-2 text-[13px] font-semibold text-slate-900"
            >
              <Camera className="h-4 w-4" />
              Capturer
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-md px-3 py-2 text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : preview ? (
        <div className="relative overflow-hidden rounded-lg border border-slate-200">
          <img
            src={preview}
            alt="Aperçu"
            className="h-40 w-full object-cover"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute right-2 top-2 rounded-full bg-white p-1 shadow hover:bg-red-50"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-4 text-[13px] font-medium text-slate-500 hover:border-[#0B3C53] hover:bg-slate-100"
          >
            <Upload className="h-4 w-4" />
            Importer un fichier
          </button>
          <button
            type="button"
            onClick={startCamera}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-[13px] font-medium text-slate-500 hover:border-[#0B3C53] hover:bg-slate-100"
          >
            <Camera className="h-4 w-4" />
            Caméra
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function SupportsPublicitairesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Données
  const [supports, setSupports] = useState<Support[]>([]);
  const [total, setTotal] = useState(0);
  const [filtres, setFiltres] = useState<FiltresDisponibles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vue
  const [viewMode, setViewMode] = useState<"liste" | "carte">("liste");

  // Filtres actifs
  const [search, setSearch] = useState("");
  const [filterCommune, setFilterCommune] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEtat, setFilterEtat] = useState("");
  const [filterVisibilite, setFilterVisibilite] = useState("");
  const [filterCanal, setFilterCanal] = useState("");
  const [filterAgent, setFilterAgent] = useState("");

  // Modal CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupport, setEditingSupport] = useState<Support | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal image plein écran
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Modal suppression
  const [deleteTarget, setDeleteTarget] = useState<Support | null>(null);

  // Redirect si non connecté
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  // Charger les filtres disponibles
  useEffect(() => {
    if (!user) return;
    apiFetch<FiltresDisponibles>("/api/supports/filtres-disponibles/")
      .then(setFiltres)
      .catch(() => {});
  }, [user]);

  // Construire la query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterCommune) params.set("commune", filterCommune);
    if (filterType) params.set("type_support", filterType);
    if (filterEtat) params.set("etat_support", filterEtat);
    if (filterVisibilite) params.set("visibilite", filterVisibilite);
    if (filterCanal) params.set("canal", filterCanal);
    if (filterAgent) params.set("agent", filterAgent);
    return params.toString();
  }, [search, filterCommune, filterType, filterEtat, filterVisibilite, filterCanal, filterAgent]);

  // Charger les supports
  const loadSupports = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PaginatedResponse<Support> | Support[]>(
        `/api/supports/?${queryString}`
      );
      if (Array.isArray(data)) {
        setSupports(data);
        setTotal(data.length);
      } else {
        setSupports(data.results);
        setTotal(data.count);
      }
    } catch {
      setError("Impossible de charger les supports.");
    } finally {
      setIsLoading(false);
    }
  }, [user, queryString]);

  useEffect(() => {
    loadSupports();
  }, [loadSupports]);

  // KPIs rapides
  const kpis = useMemo(() => {
    const actifs = supports.filter((s) => !s.isDeleted);
    return {
      total: actifs.length,
      bons: actifs.filter((s) => s.etatSupport === "Bon").length,
      deteriores: actifs.filter((s) => s.etatSupport === "Détérioré").length,
      surface: actifs.reduce((sum, s) => sum + (s.surface ?? 0), 0),
    };
  }, [supports]);

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  function openCreate() {
    setEditingSupport(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(s: Support) {
    setEditingSupport(s);
    setForm({
      ...s,
      imageSupportFile: null,
      imageSupportSecondaireFile: null,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fd = new FormData();

      // Champs texte
      const textFields: (keyof typeof form)[] = [
        "marque", "entreprise", "ville", "commune", "region",
        "district", "village", "quartier", "nomSite", "typeSupport",
        "canal", "etatSupport", "typeSite", "visibilite",
        "description", "observation",
        "responsableNom", "responsablePrenom", "responsableContact",
        "signataireNom", "signatairePrenom", "signataireContact",
      ];
      textFields.forEach((k) => {
        const v = form[k];
        if (v !== null && v !== undefined) fd.append(k as string, String(v));
      });

      // Champs numériques
      const numFields: (keyof typeof form)[] = [
        "surface", "nombreSupport", "nombreFace", "surfaceODP",
        "duree", "tsp", "odpValue", "latitude", "longitude",
      ];
      numFields.forEach((k) => {
        const v = form[k];
        if (v !== null && v !== undefined) fd.append(k as string, String(v));
      });

      // Champs booléens
      const boolFields: (keyof typeof form)[] = [
        "anciennete", "odp", "ap", "apa", "apt",
        "ae", "aea", "aet", "tauxCommune", "tauxRegion", "tauxDistrict",
      ];
      boolFields.forEach((k) => {
        fd.append(k as string, form[k] ? "true" : "false");
      });

      // Images
      if (form.imageSupportFile) fd.append("image_support", form.imageSupportFile);
      if (form.imageSupportSecondaireFile)
        fd.append("image_support_s", form.imageSupportSecondaireFile);

      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const url = editingSupport
        ? `${BASE_URL}/api/supports/${editingSupport.id}/`
        : `${BASE_URL}/api/supports/`;
      const method = editingSupport ? "PATCH" : "POST";

      const res = await fetch(url, { method, headers, body: fd });
      if (!res.ok) throw new Error("Erreur serveur");

      const saved: Support = await res.json();

      if (editingSupport) {
        setSupports((prev) =>
          prev.map((s) => (s.id === saved.id ? saved : s))
        );
      } else {
        setSupports((prev) => [saved, ...prev]);
        setTotal((t) => t + 1);
      }
      setModalOpen(false);
    } catch {
      alert("Erreur lors de la sauvegarde. Vérifiez les champs.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSoftDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/supports/${deleteTarget.id}/soft_delete/`, {
        method: "POST",
      });
      setSupports((prev) =>
        prev.filter((s) => s.id !== deleteTarget.id)
      );
      setTotal((t) => t - 1);
      setDeleteTarget(null);
    } catch {
      alert("Erreur lors de la suppression.");
    }
  }

  function resetFilters() {
    setSearch("");
    setFilterCommune("");
    setFilterType("");
    setFilterEtat("");
    setFilterVisibilite("");
    setFilterCanal("");
    setFilterAgent("");
  }

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
            <p className="text-[13px] font-semibold text-slate-800">
              {user.entrepriseNom ?? "Entreprise"}
            </p>
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
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13px] font-medium transition-colors ${
                        isActive
                          ? "bg-[#0B3C53] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
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
            <h2 className="text-[15px] font-bold text-slate-900">Supports publicitaires</h2>
            <p className="text-[12px] text-slate-400">Gestion · Recensement terrain</p>
          </div>
          <div className="flex items-center gap-4">
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
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          {/* Titre + actions */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="border-l-4 border-[#0B3C53] pl-3">
              <h1 className="text-2xl font-bold text-slate-900">Supports publicitaires</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Recensement, état et fiscalité des supports terrain
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Bascule liste / carte */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("liste")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    viewMode === "liste"
                      ? "bg-[#0B3C53] text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Liste
                </button>
                <button
                  onClick={() => setViewMode("carte")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    viewMode === "carte"
                      ? "bg-[#0B3C53] text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Carte
                </button>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#0B3C53]/90"
              >
                <Plus className="h-4 w-4" />
                Nouveau support
              </button>
            </div>
          </div>

          {/* KPIs rapides */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Supports actifs", value: kpis.total, icon: Boxes, badge: "bg-violet-500" },
              { label: "En bon état", value: kpis.bons, icon: CheckCircle2, badge: "bg-emerald-500" },
              { label: "À traiter", value: kpis.deteriores, icon: XCircle, badge: "bg-red-500" },
              { label: "Surface totale (m²)", value: kpis.surface, icon: SlidersHorizontal, badge: "bg-cyan-500" },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {kpi.label}
                    </p>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.badge}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {formatNumber(kpi.value)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Filtres */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une marque, un site, un quartier..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53] focus:bg-white"
                />
              </div>
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-[13px] font-medium text-slate-500 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                {
                  label: "Commune",
                  value: filterCommune,
                  setter: setFilterCommune,
                  options: filtres?.communes ?? [],
                  placeholder: "Toutes",
                },
                {
                  label: "Type de support",
                  value: filterType,
                  setter: setFilterType,
                  options: filtres?.typesSupport ?? [],
                  placeholder: "Tous",
                },
                {
                  label: "État",
                  value: filterEtat,
                  setter: setFilterEtat,
                  options: filtres?.etatsSupport ?? ["Bon", "Défraichi", "Détérioré"],
                  placeholder: "Tous",
                },
                {
                  label: "Visibilité",
                  value: filterVisibilite,
                  setter: setFilterVisibilite,
                  options: filtres?.visibilites ?? [],
                  placeholder: "Toutes",
                },
                {
                  label: "Canal",
                  value: filterCanal,
                  setter: setFilterCanal,
                  options: filtres?.canaux ?? [],
                  placeholder: "Tous",
                },
                {
                  label: "Agent",
                  value: filterAgent,
                  setter: setFilterAgent,
                  options: (filtres?.agents ?? []).map((a) => a.nomComplet),
                  placeholder: "Tous",
                },
              ].map((f) => (
                <label key={f.label} className="block">
                  <span className="mb-1 block text-[11px] font-medium text-slate-400">
                    {f.label}
                  </span>
                  <select
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
                  >
                    <option value="">{f.placeholder}</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {/* État de chargement / erreur */}
          {isLoading && (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" />
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-[13px] text-red-700">{error}</p>
              <button
                onClick={loadSupports}
                className="ml-auto text-[13px] font-semibold text-red-700 underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Vue liste */}
          {!isLoading && !error && viewMode === "liste" && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <p className="text-[13px] font-medium text-slate-500">
                  {total} support{total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5">Photo</th>
                      <th className="px-3 py-2.5">Marque / Site</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Commune</th>
                      <th className="px-3 py-2.5">Surface</th>
                      <th className="px-3 py-2.5">Faces</th>
                      <th className="px-3 py-2.5">État</th>
                      <th className="px-3 py-2.5">Visibilité</th>
                      <th className="px-3 py-2.5">Agent</th>
                      <th className="px-3 py-2.5">Date collecte</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supports.map((s) => {
                      const imgUrl = imageUrl(s.imageSupport);
                      return (
                        <tr
                          key={s.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          {/* Miniature photo */}
                          <td className="px-4 py-2.5">
                            {imgUrl ? (
                              <button
                                onClick={() => setLightboxUrl(imgUrl)}
                                className="group relative h-12 w-12 overflow-hidden rounded-lg border border-slate-200"
                              >
                                <img
                                  src={imgUrl}
                                  alt="Support"
                                  className="h-full w-full object-cover transition group-hover:scale-110"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                                  <Eye className="h-4 w-4 text-white opacity-0 transition group-hover:opacity-100" />
                                </div>
                              </button>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-slate-800">{s.marque}</p>
                            <p className="text-[12px] text-slate-400">{s.nomSite}</p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                            {s.typeSupport || "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                            {s.commune}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                            {s.surface ? `${s.surface} m²` : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                            {s.nombreFace ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                ETAT_BADGE[s.etatSupport] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${ETAT_DOT[s.etatSupport] ?? "bg-slate-400"}`}
                              />
                              {s.etatSupport}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                VISIBILITE_BADGE[s.visibilite] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {s.visibilite || "—"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-500">
                            {s.agentNom ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-500">
                            {formatDate(s.dateCollecte)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(s)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(s)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {supports.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={11} className="px-5 py-12 text-center text-slate-400">
                          Aucun support ne correspond à ces filtres.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vue carte */}
          {!isLoading && !error && viewMode === "carte" && (
            <div className="h-[580px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <SupportsMap
                supports={supports.map((s) => ({
                    ...s,
                    id: String(s.id),
                    agent: s.agent != null ? String(s.agent) : "",
                    agentNom: s.agentNom ?? "",
                    etatSupport: s.etatSupport as EtatSupport,
                    canal: s.canal as Canal,
                    visibilite: (s.visibilite || "Moyenne") as Visibilite,
                })) as SupportPublicitaire[]}
                onEdit={(s) => {
                    const original = supports.find((x) => String(x.id) === s.id);
                    if (original) openEdit(original);
                }}
                />
            </div>
          )}
        </main>
      </div>

      {/* ===================== MODAL CRUD ===================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
            {/* En-tête modal */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[16px] font-bold text-slate-900">
                {editingSupport ? "Modifier le support" : "Nouveau support"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corps scrollable */}
            <form
              id="support-form"
              onSubmit={handleSubmit}
              className="flex-1 space-y-6 overflow-y-auto px-6 py-5"
            >
              {/* Identification */}
              <div>
                <SectionTitle>Identification</SectionTitle>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Marque *">
                    <TextInput
                      value={form.marque ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, marque: v }))}
                    />
                  </FormField>
                  <FormField label="Entreprise">
                    <TextInput
                      value={form.entreprise ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, entreprise: v }))}
                    />
                  </FormField>
                  <FormField label="Nom du site">
                    <TextInput
                      value={form.nomSite ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, nomSite: v }))}
                    />
                  </FormField>
                </div>
              </div>

              {/* Localisation */}
              <div>
                <SectionTitle>Localisation</SectionTitle>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Commune">
                    {filtres?.communes.length ? (
                      <SelectInput
                        value={form.commune ?? ""}
                        onChange={(v) => setForm((f) => ({ ...f, commune: v }))}
                        options={filtres.communes}
                        placeholder="— Choisir —"
                      />
                    ) : (
                      <TextInput
                        value={form.commune ?? ""}
                        onChange={(v) => setForm((f) => ({ ...f, commune: v }))}
                        placeholder="ex: Cocody"
                      />
                    )}
                  </FormField>
                  <FormField label="Quartier">
                    <TextInput
                      value={form.quartier ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, quartier: v }))}
                    />
                  </FormField>
                  <FormField label="Ville">
                    <TextInput
                      value={form.ville ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, ville: v }))}
                    />
                  </FormField>
                  <FormField label="Latitude">
                    <TextInput
                      type="number"
                      value={form.latitude ?? null}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, latitude: v ? parseFloat(v) : null }))
                      }
                      placeholder="ex: 5.3247"
                    />
                  </FormField>
                  <FormField label="Longitude">
                    <TextInput
                      type="number"
                      value={form.longitude ?? null}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, longitude: v ? parseFloat(v) : null }))
                      }
                      placeholder="ex: -4.0187"
                    />
                  </FormField>
                </div>
              </div>

              {/* Caractéristiques */}
              <div>
                <SectionTitle>Caractéristiques techniques</SectionTitle>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Type de support">
                    {filtres?.typesSupport.length ? (
                      <SelectInput
                        value={form.typeSupport ?? ""}
                        onChange={(v) => setForm((f) => ({ ...f, typeSupport: v }))}
                        options={filtres.typesSupport}
                        placeholder="— Choisir —"
                      />
                    ) : (
                      <TextInput
                        value={form.typeSupport ?? ""}
                        onChange={(v) => setForm((f) => ({ ...f, typeSupport: v }))}
                      />
                    )}
                  </FormField>
                  <FormField label="Canal">
                    {filtres?.canaux.length ? (
                      <SelectInput
                        value={form.canal ?? ""}
                        onChange={(v) => setForm((f) => ({ ...f, canal: v }))}
                        options={filtres.canaux}
                        placeholder="— Choisir —"
                      />
                    ) : (
                      <TextInput
                        value={form.canal ?? ""}
                        onChange={(v) => setForm((f) => ({ ...f, canal: v }))}
                      />
                    )}
                  </FormField>
                  <FormField label="Surface (m²)">
                    <TextInput
                      type="number"
                      value={form.surface ?? null}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, surface: v ? parseFloat(v) : null }))
                      }
                    />
                  </FormField>
                  <FormField label="Nombre de faces">
                    <TextInput
                      type="number"
                      value={form.nombreFace ?? null}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, nombreFace: v ? parseFloat(v) : null }))
                      }
                    />
                  </FormField>
                  <FormField label="État du support">
                    <SelectInput
                      value={form.etatSupport ?? "Bon"}
                      onChange={(v) => setForm((f) => ({ ...f, etatSupport: v }))}
                      options={filtres?.etatsSupport ?? ["Bon", "Défraichi", "Détérioré"]}
                    />
                  </FormField>
                  <FormField label="Visibilité">
                    <SelectInput
                      value={form.visibilite ?? "Bonne"}
                      onChange={(v) => setForm((f) => ({ ...f, visibilite: v }))}
                      options={filtres?.visibilites ?? ["Excellente", "Bonne", "Moyenne", "Faible"]}
                    />
                  </FormField>
                </div>
              </div>

              {/* Photos */}
              <div>
                <SectionTitle>Photos du support</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <ImageUploadField
                    label="Photo principale"
                    currentUrl={imageUrl(editingSupport?.imageSupport ?? null)}
                    onFileSelect={(file) =>
                      setForm((f) => ({ ...f, imageSupportFile: file }))
                    }
                  />
                  <ImageUploadField
                    label="Photo secondaire"
                    currentUrl={imageUrl(editingSupport?.imageSupportSecondaire ?? null)}
                    onFileSelect={(file) =>
                      setForm((f) => ({ ...f, imageSupportSecondaireFile: file }))
                    }
                  />
                </div>
              </div>

              {/* Responsable terrain */}
              <div>
                <SectionTitle>Responsable terrain</SectionTitle>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Nom">
                    <TextInput
                      value={form.responsableNom ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, responsableNom: v }))}
                    />
                  </FormField>
                  <FormField label="Prénom">
                    <TextInput
                      value={form.responsablePrenom ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, responsablePrenom: v }))}
                    />
                  </FormField>
                  <FormField label="Contact">
                    <TextInput
                      value={form.responsableContact ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, responsableContact: v }))}
                    />
                  </FormField>
                </div>
              </div>

              {/* Fiscalité */}
              <div>
                <SectionTitle>Fiscalité</SectionTitle>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Durée (mois)">
                    <TextInput
                      type="number"
                      value={form.duree ?? null}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, duree: v ? parseFloat(v) : null }))
                      }
                    />
                  </FormField>
                  <FormField label="TSP (FCFA)">
                    <TextInput
                      type="number"
                      value={form.tsp ?? null}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, tsp: v ? parseFloat(v) : null }))
                      }
                    />
                  </FormField>
                  <FormField label="Valeur ODP (FCFA)">
                    <TextInput
                      type="number"
                      value={form.odpValue ?? null}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, odpValue: v ? parseFloat(v) : null }))
                      }
                    />
                  </FormField>
                  <div className="col-span-3 flex flex-wrap gap-4 pt-1">
                    <CheckboxInput
                      label="ODP"
                      checked={form.odp ?? false}
                      onChange={(v) => setForm((f) => ({ ...f, odp: v }))}
                    />
                    <CheckboxInput
                      label="AP"
                      checked={form.ap ?? false}
                      onChange={(v) => setForm((f) => ({ ...f, ap: v }))}
                    />
                    <CheckboxInput
                      label="AE"
                      checked={form.ae ?? false}
                      onChange={(v) => setForm((f) => ({ ...f, ae: v }))}
                    />
                    <CheckboxInput
                      label="Ancienneté"
                      checked={form.anciennete ?? false}
                      onChange={(v) => setForm((f) => ({ ...f, anciennete: v }))}
                    />
                    <CheckboxInput
                      label="Taux commune"
                      checked={form.tauxCommune ?? false}
                      onChange={(v) => setForm((f) => ({ ...f, tauxCommune: v }))}
                    />
                    <CheckboxInput
                      label="Taux région"
                      checked={form.tauxRegion ?? false}
                      onChange={(v) => setForm((f) => ({ ...f, tauxRegion: v }))}
                    />
                    <CheckboxInput
                      label="Taux district"
                      checked={form.tauxDistrict ?? false}
                      onChange={(v) => setForm((f) => ({ ...f, tauxDistrict: v }))}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <SectionTitle>Description & observations</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Description">
                    <textarea
                      value={form.description ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      rows={2}
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
                    />
                  </FormField>
                  <FormField label="Observation">
                    <textarea
                      value={form.observation ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, observation: e.target.value }))
                      }
                      rows={2}
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
                    />
                  </FormField>
                </div>
              </div>
            </form>

            {/* Footer modal */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                form="support-form"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSupport ? "Enregistrer les modifications" : "Créer le support"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== LIGHTBOX IMAGE ===================== */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Support publicitaire"
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ===================== MODAL SUPPRESSION ===================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="mb-1.5 text-[15px] font-bold text-slate-900">
              Supprimer ce support ?
            </h2>
            <p className="mb-5 text-[13px] text-slate-500">
              <span className="font-medium text-slate-700">
                {deleteTarget.marque} — {deleteTarget.nomSite}
              </span>{" "}
              sera retiré de la liste active. Cette action peut être annulée par un
              administrateur.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSoftDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}