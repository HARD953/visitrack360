"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
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
  Search,
  X,
  Loader2,
  AlertCircle,
  MapPin,
  Layers,
  Filter,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Eye,
  Pencil,
  Maximize2,
  BarChart2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Boxes,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  Crosshair,
  List,
  Handshake
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";

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

import type { SupportPublicitaire, EtatSupport, Canal, Visibilite } from "@/types/dashboard";

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

function imageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
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

const ACTIVE_HREF = "/carte-des-supports";

// ---------------------------------------------------------------------------
// Composant panneau latéral support sélectionné
// ---------------------------------------------------------------------------

function SupportDetailPanel({
  support,
  onClose,
  onEdit,
}: {
  support: Support;
  onClose: () => void;
  onEdit: (s: Support) => void;
}) {
  const img = imageUrl(support.imageSupport);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${ETAT_DOT[support.etatSupport] ?? "bg-slate-400"}`}
          />
          <span className="text-[13px] font-bold text-slate-800">
            {support.marque}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Photo */}
      {img && (
        <div className="relative h-40 w-full overflow-hidden bg-slate-100">
          <img
            src={img}
            alt={support.marque}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <p className="absolute bottom-2 left-3 text-[11px] font-semibold text-white/80">
            {support.nomSite}
          </p>
        </div>
      )}

      {/* Corps scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Badges état + visibilité */}
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              ETAT_BADGE[support.etatSupport] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${ETAT_DOT[support.etatSupport] ?? "bg-slate-400"}`}
            />
            {support.etatSupport}
          </span>
          {support.visibilite && (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                VISIBILITE_BADGE[support.visibilite] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {support.visibilite}
            </span>
          )}
          {support.typeSupport && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              {support.typeSupport}
            </span>
          )}
        </div>

        {/* Infos principales */}
        <DetailSection title="Localisation">
          <DetailRow label="Commune" value={support.commune} />
          <DetailRow label="Quartier" value={support.quartier} />
          <DetailRow label="Ville" value={support.ville} />
          {support.latitude && support.longitude && (
            <DetailRow
              label="Coordonnées"
              value={`${support.latitude.toFixed(5)}, ${support.longitude.toFixed(5)}`}
              mono
            />
          )}
        </DetailSection>

        <DetailSection title="Caractéristiques">
          <DetailRow label="Canal" value={support.canal} />
          <DetailRow
            label="Surface"
            value={support.surface ? `${support.surface} m²` : undefined}
          />
          <DetailRow
            label="Faces"
            value={support.nombreFace?.toString()}
          />
          <DetailRow
            label="Nombre de supports"
            value={support.nombreSupport?.toString()}
          />
          <DetailRow label="Type de site" value={support.typeSite} />
        </DetailSection>

        {support.agentNom && (
          <DetailSection title="Agent recenseur">
            <DetailRow label="Agent" value={support.agentNom} />
            <DetailRow
              label="Date de collecte"
              value={formatDate(support.dateCollecte)}
            />
          </DetailSection>
        )}

        {(support.responsableNom || support.responsablePrenom) && (
          <DetailSection title="Responsable terrain">
            <DetailRow
              label="Nom"
              value={`${support.responsablePrenom} ${support.responsableNom}`.trim()}
            />
            <DetailRow label="Contact" value={support.responsableContact} />
          </DetailSection>
        )}

        {support.description && (
          <DetailSection title="Description">
            <p className="text-[12px] leading-relaxed text-slate-600">
              {support.description}
            </p>
          </DetailSection>
        )}

        {support.observation && (
          <DetailSection title="Observation">
            <p className="text-[12px] leading-relaxed text-slate-500">
              {support.observation}
            </p>
          </DetailSection>
        )}

        {/* Fiscalité */}
        {(support.tsp || support.odpValue) && (
          <DetailSection title="Fiscalité">
            {support.tsp && (
              <DetailRow
                label="TSP"
                value={`${formatNumber(support.tsp)} FCFA`}
              />
            )}
            {support.odpValue && (
              <DetailRow
                label="ODP"
                value={`${formatNumber(support.odpValue)} FCFA`}
              />
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {support.odp && <TaxTag label="ODP" />}
              {support.ap && <TaxTag label="AP" />}
              {support.ae && <TaxTag label="AE" />}
              {support.anciennete && <TaxTag label="Ancienneté" />}
              {support.tauxCommune && <TaxTag label="Taux commune" />}
              {support.tauxRegion && <TaxTag label="Taux région" />}
              {support.tauxDistrict && <TaxTag label="Taux district" />}
            </div>
          </DetailSection>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <button
          onClick={() => onEdit(support)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B3C53] py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90"
        >
          <Pencil className="h-4 w-4" />
          Modifier ce support
        </button>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[12px] text-slate-400">{label}</span>
      <span
        className={`text-right text-[12px] font-medium text-slate-700 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function TaxTag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Composant statistiques rapides (overlay bas de carte)
// ---------------------------------------------------------------------------

function MapStatsBar({ supports }: { supports: Support[] }) {
  const actifs = supports.filter((s) => !s.isDeleted);
  const bons = actifs.filter((s) => s.etatSupport === "Bon").length;
  const defraichis = actifs.filter((s) => s.etatSupport === "Défraichi").length;
  const deteriores = actifs.filter((s) => s.etatSupport === "Détérioré").length;
  const surface = actifs.reduce((sum, s) => sum + (s.surface ?? 0), 0);

  const pct = (n: number) =>
    actifs.length ? Math.round((n / actifs.length) * 100) : 0;

  return (
    <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm divide-x divide-slate-100">
      <StatPill
        icon={<Boxes className="h-3.5 w-3.5 text-violet-500" />}
        label="Total"
        value={formatNumber(actifs.length)}
        color="text-slate-900"
      />
      <StatPill
        icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        label="Bons"
        value={`${bons} (${pct(bons)}%)`}
        color="text-emerald-700"
      />
      <StatPill
        icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
        label="Défraichis"
        value={`${defraichis} (${pct(defraichis)}%)`}
        color="text-amber-700"
      />
      <StatPill
        icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
        label="Détériorés"
        value={`${deteriores} (${pct(deteriores)}%)`}
        color="text-red-700"
      />
      <StatPill
        icon={<SlidersHorizontal className="h-3.5 w-3.5 text-cyan-500" />}
        label="Surface m²"
        value={formatNumber(surface)}
        color="text-slate-900"
      />
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      {icon}
      <div>
        <p className="text-[10px] text-slate-400">{label}</p>
        <p className={`text-[13px] font-bold tabular-nums ${color}`}>{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Légende carte
// ---------------------------------------------------------------------------

function MapLegend() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Légende
      </p>
      <div className="space-y-1.5">
        {[
          { color: "bg-emerald-500", label: "Bon état" },
          { color: "bg-amber-500", label: "Défraichi" },
          { color: "bg-red-500", label: "Détérioré" },
          { color: "bg-slate-400", label: "État inconnu" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
            <span className="text-[12px] text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Liste supports (panneau liste résultats)
// ---------------------------------------------------------------------------

function SupportListPanel({
  supports,
  selectedId,
  onSelect,
}: {
  supports: Support[];
  selectedId: number | null;
  onSelect: (s: Support) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
      {supports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
          <MapPin className="mb-3 h-8 w-8 text-slate-200" />
          <p className="text-[13px]">Aucun support correspondant</p>
          <p className="text-[11px] mt-1">Modifiez vos filtres pour en afficher</p>
        </div>
      )}
      {supports.map((s) => {
        const isSelected = s.id === selectedId;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
              isSelected ? "bg-blue-50 border-l-2 border-[#0B3C53]" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  ETAT_DOT[s.etatSupport] ?? "bg-slate-400"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-800">
                  {s.marque}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {s.nomSite || s.quartier} · {s.commune}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {s.typeSupport && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {s.typeSupport}
                    </span>
                  )}
                  {s.surface && (
                    <span className="text-[10px] text-slate-400">
                      {s.surface} m²
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function CarteDesSupportsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Données
  const [supports, setSupports] = useState<Support[]>([]);
  const [total, setTotal] = useState(0);
  const [filtres, setFiltres] = useState<FiltresDisponibles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [listPanelOpen, setListPanelOpen] = useState(false);
  const [selectedSupport, setSelectedSupport] = useState<Support | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Filtres actifs
  const [search, setSearch] = useState("");
  const [filterCommune, setFilterCommune] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEtat, setFilterEtat] = useState("");
  const [filterVisibilite, setFilterVisibilite] = useState("");
  const [filterCanal, setFilterCanal] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterSurfaceMin, setFilterSurfaceMin] = useState("");
  const [filterSurfaceMax, setFilterSurfaceMax] = useState("");
  const [filterAvecPhoto, setFilterAvecPhoto] = useState(false);
  const [filterOdp, setFilterOdp] = useState(false);
  const [filterAnciennete, setFilterAnciennete] = useState(false);
  const [filterGeoSeulement, setFilterGeoSeulement] = useState(true);

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
    if (filterSurfaceMin) params.set("surface_min", filterSurfaceMin);
    if (filterSurfaceMax) params.set("surface_max", filterSurfaceMax);
    if (filterAvecPhoto) params.set("avec_photo", "true");
    if (filterOdp) params.set("odp", "true");
    if (filterAnciennete) params.set("anciennete", "true");
    return params.toString();
  }, [
    search, filterCommune, filterType, filterEtat, filterVisibilite,
    filterCanal, filterAgent, filterSurfaceMin, filterSurfaceMax,
    filterAvecPhoto, filterOdp, filterAnciennete,
  ]);

  // Compter les filtres actifs
  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (search) n++;
    if (filterCommune) n++;
    if (filterType) n++;
    if (filterEtat) n++;
    if (filterVisibilite) n++;
    if (filterCanal) n++;
    if (filterAgent) n++;
    if (filterSurfaceMin) n++;
    if (filterSurfaceMax) n++;
    if (filterAvecPhoto) n++;
    if (filterOdp) n++;
    if (filterAnciennete) n++;
    return n;
  }, [
    search, filterCommune, filterType, filterEtat, filterVisibilite,
    filterCanal, filterAgent, filterSurfaceMin, filterSurfaceMax,
    filterAvecPhoto, filterOdp, filterAnciennete,
  ]);

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

  // Supports géolocalisés uniquement
  const supportsAffiches = useMemo(() => {
    const base = supports.filter((s) => !s.isDeleted);
    if (filterGeoSeulement) {
      return base.filter(
        (s) => s.latitude !== null && s.longitude !== null
      );
    }
    return base;
  }, [supports, filterGeoSeulement]);

  function resetFilters() {
    setSearch("");
    setFilterCommune("");
    setFilterType("");
    setFilterEtat("");
    setFilterVisibilite("");
    setFilterCanal("");
    setFilterAgent("");
    setFilterSurfaceMin("");
    setFilterSurfaceMax("");
    setFilterAvecPhoto(false);
    setFilterOdp(false);
    setFilterAnciennete(false);
    setFilterGeoSeulement(true);
  }

  function handleSelectSupport(s: Support) {
    setSelectedSupport(s);
    setListPanelOpen(false);
  }

  if (!user) return null;

  const nonGeolocCount = supports.filter(
    (s) => !s.isDeleted && (s.latitude === null || s.longitude === null)
  ).length;

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
            <h2 className="text-[15px] font-bold text-slate-900">Carte des supports</h2>
            <p className="text-[12px] text-slate-400">
              Visualisation géographique · {formatNumber(supportsAffiches.length)} support{supportsAffiches.length > 1 ? "s" : ""} affiché{supportsAffiches.length > 1 ? "s" : ""}
            </p>
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

        {/* Layout carte : bandeau filtres + carte */}
        <div className="flex flex-1 overflow-hidden">

          {/* ============ PANNEAU FILTRES (gauche) ============ */}
          <div
            className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
              filterPanelOpen ? "w-72 shrink-0" : "w-0 overflow-hidden"
            }`}
          >
            {filterPanelOpen && (
              <>
                {/* En-tête panneau filtres */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[#0B3C53]" />
                    <span className="text-[13px] font-bold text-slate-900">Filtres</span>
                    {activeFiltersCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0B3C53] text-[10px] font-bold text-white">
                        {activeFiltersCount}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-[#0B3C53]"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Tout effacer
                  </button>
                </div>

                {/* Corps filtres scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

                  {/* Recherche texte */}
                  <FilterSection title="Recherche">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Marque, site, quartier…"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-[#0B3C53] focus:bg-white"
                      />
                      {search && (
                        <button
                          onClick={() => setSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2"
                        >
                          <X className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </FilterSection>

                  {/* Localisation */}
                  <FilterSection title="Localisation">
                    <FilterSelect
                      label="Commune"
                      value={filterCommune}
                      onChange={setFilterCommune}
                      options={filtres?.communes ?? []}
                      placeholder="Toutes les communes"
                    />
                  </FilterSection>

                  {/* Type de support */}
                  <FilterSection title="Type de support">
                    <div className="grid grid-cols-1 gap-1.5">
                      <FilterSelect
                        label="Type"
                        value={filterType}
                        onChange={setFilterType}
                        options={filtres?.typesSupport ?? []}
                        placeholder="Tous les types"
                      />
                      <FilterSelect
                        label="Canal"
                        value={filterCanal}
                        onChange={setFilterCanal}
                        options={filtres?.canaux ?? []}
                        placeholder="Tous les canaux"
                      />
                    </div>
                  </FilterSection>

                  {/* État & Qualité */}
                  <FilterSection title="État & Qualité">
                    <FilterSelect
                      label="État du support"
                      value={filterEtat}
                      onChange={setFilterEtat}
                      options={filtres?.etatsSupport ?? ["Bon", "Défraichi", "Détérioré"]}
                      placeholder="Tous les états"
                    />
                    <FilterSelect
                      label="Visibilité"
                      value={filterVisibilite}
                      onChange={setFilterVisibilite}
                      options={filtres?.visibilites ?? ["Excellente", "Bonne", "Moyenne", "Faible"]}
                      placeholder="Toutes"
                    />
                  </FilterSection>

                  {/* Surface */}
                  <FilterSection title="Surface (m²)">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={filterSurfaceMin}
                        onChange={(e) => setFilterSurfaceMin(e.target.value)}
                        placeholder="Min"
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-[#0B3C53]"
                      />
                      <span className="text-[12px] text-slate-400">—</span>
                      <input
                        type="number"
                        value={filterSurfaceMax}
                        onChange={(e) => setFilterSurfaceMax(e.target.value)}
                        placeholder="Max"
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-[#0B3C53]"
                      />
                    </div>
                  </FilterSection>

                  {/* Agent */}
                  <FilterSection title="Agent recenseur">
                    <FilterSelect
                      label="Agent"
                      value={filterAgent}
                      onChange={setFilterAgent}
                      options={(filtres?.agents ?? []).map((a) => a.nomComplet)}
                      placeholder="Tous les agents"
                    />
                  </FilterSection>

                  {/* Options avancées */}
                  <FilterSection title="Options avancées">
                    <div className="space-y-2.5">
                      <FilterCheckbox
                        label="Géolocalisés uniquement"
                        checked={filterGeoSeulement}
                        onChange={setFilterGeoSeulement}
                        hint={nonGeolocCount > 0 ? `${nonGeolocCount} sans coord.` : undefined}
                      />
                      <FilterCheckbox
                        label="Avec photo uniquement"
                        checked={filterAvecPhoto}
                        onChange={setFilterAvecPhoto}
                      />
                      <FilterCheckbox
                        label="Avec ODP"
                        checked={filterOdp}
                        onChange={setFilterOdp}
                      />
                      <FilterCheckbox
                        label="Avec ancienneté"
                        checked={filterAnciennete}
                        onChange={setFilterAnciennete}
                      />
                    </div>
                  </FilterSection>

                </div>

                {/* Footer panneau filtres */}
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="text-center text-[11px] text-slate-400">
                    <span className="font-bold text-slate-700">
                      {formatNumber(supportsAffiches.length)}
                    </span>{" "}
                    support{supportsAffiches.length > 1 ? "s" : ""} sur la carte
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Bouton toggle filtre (flottant à gauche de la carte) */}
          <button
            onClick={() => setFilterPanelOpen((v) => !v)}
            className="absolute z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md hover:bg-slate-50"
            style={{
              top: "calc(64px + 32px)",
              left: filterPanelOpen ? "calc(256px + 72px + 272px - 16px)" : "calc(256px + 72px - 16px)",
              transition: "left 0.3s",
            }}
            title={filterPanelOpen ? "Masquer les filtres" : "Afficher les filtres"}
          >
            {filterPanelOpen ? (
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {/* ============ ZONE CARTE ============ */}
          <div className="relative flex flex-1 overflow-hidden">

            {/* Erreur */}
            {error && (
              <div className="absolute left-4 right-4 top-4 z-30 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 shadow-lg">
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

            {/* Loader */}
            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0B3C53]" />
                  <span className="text-[13px] font-medium text-slate-600">
                    Chargement des supports…
                  </span>
                </div>
              </div>
            )}

            {/* Carte */}
            {!error && (
              <div className="flex-1">
                <SupportsMap
                supports={supportsAffiches.map((s) => ({
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
                    if (original) setSelectedSupport(original);
                }}
                />                        
              </div>
            )}

            {/* Contrôles flottants (haut droite) */}
            <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
              <div className="pointer-events-auto flex flex-col gap-2">
                {/* Bouton liste */}
                <button
                  onClick={() => {
                    setListPanelOpen((v) => !v);
                    if (selectedSupport) setSelectedSupport(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold shadow-lg transition-colors ${
                    listPanelOpen
                      ? "border-[#0B3C53] bg-[#0B3C53] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  {listPanelOpen ? "Fermer la liste" : "Voir la liste"}
                </button>
              </div>
            </div>

            {/* Légende (bas gauche) */}
            <div className="pointer-events-none absolute bottom-20 left-4 z-10">
              <div className="pointer-events-auto">
                <MapLegend />
              </div>
            </div>

            {/* Stats bar (bas centré) */}
            <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 flex justify-center px-4">
              <div className="pointer-events-auto">
                <MapStatsBar supports={supports} />
              </div>
            </div>

            {/* Alerte supports non géolocalisés */}
            {nonGeolocCount > 0 && !filterGeoSeulement && (
              <div className="pointer-events-none absolute left-4 top-4 z-10">
                <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 shadow-md">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-[12px] text-amber-700">
                    <span className="font-bold">{nonGeolocCount}</span> support{nonGeolocCount > 1 ? "s" : ""} sans coordonnées GPS
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ============ PANNEAU LISTE / DETAIL (droite) ============ */}
          {(listPanelOpen || selectedSupport) && (
            <div className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
              {selectedSupport ? (
                <SupportDetailPanel
                  support={selectedSupport}
                  onClose={() => setSelectedSupport(null)}
                  onEdit={() => {}}
                />
              ) : (
                <>
                  {/* En-tête liste */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4 text-[#0B3C53]" />
                      <span className="text-[13px] font-bold text-slate-900">
                        {formatNumber(supportsAffiches.length)} supports
                      </span>
                    </div>
                    <button
                      onClick={() => setListPanelOpen(false)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Recherche rapide dans la liste */}
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        placeholder="Filtrer la liste…"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-[#0B3C53] focus:bg-white"
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <SupportListPanel
                    supports={supportsAffiches}
                    selectedId={selectedSupport ? (selectedSupport as Support).id : null}
                    onSelect={handleSelectSupport}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composants filtres
// ---------------------------------------------------------------------------

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      {label && (
        <p className="mb-1 text-[11px] font-medium text-slate-500">{label}</p>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-[#0B3C53]"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-[#0B3C53]"
      />
      <span className="flex-1 text-[12px] text-slate-600">{label}</span>
      {hint && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
          {hint}
        </span>
      )}
    </label>
  );
}