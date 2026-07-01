"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
  Pencil,
  Trash2,
  X,
  Search,
  RefreshCw,
  FileText,
  Upload,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  BadgeCheck,
  Banknote,
  Filter,
  Handshake
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getAccessToken } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://backend360.onrender.com";

type Statut =
  | "recu"
  | "en_analyse"
  | "conteste"
  | "valide"
  | "negocie"
  | "paye";

interface OrdreDeRecettes {
  id: number;
  typeCollectivite: string;
  nomCollectivite: string;
  commune: string;
  region: string;
  district: string;
  interlocuteur: string;
  reference: string;
  dateEmission: string | null;
  periodeDebut: string | null;
  periodeFin: string | null;
  pieceJointe: string | null;
  montantReclame: number;
  penalites: number;
  fraisAnnexes: number;
  montantTotal: number;
  nombreSupportsFactures: number;
  typeSupportFacture: string;
  surfaceFacturee: number | null;
  localiteFacturee: string;
  statut: Statut;
  prochaineAction: string;
  commentaire: string;
  responsable: number | null;
  responsableNom: string | null;
  creeLe: string;
  modifieLe: string;
}

interface Statistiques {
  total: number;
  montantTotal: number;
  penalitesTotal: number;
  parStatut: { statut: string; count: number; montant: number }[];
}

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

// Types pour les listes déroulantes
interface Commune {
  id: number;
  nom: string;
  code: string;
  region: number;
}

interface Region {
  id: number;
  nom: string;
  code: string;
  district: number;
}

interface District {
  id: number;
  nom: string;
  code: string;
}

interface Agent {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  nomComplet: string;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STATUTS: { value: Statut; label: string; icon: ReactNode; badge: string; dot: string }[] = [
  { value: "recu", label: "Reçu", icon: <Clock className="h-3.5 w-3.5" />, badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  { value: "en_analyse", label: "En analyse", icon: <Search className="h-3.5 w-3.5" />, badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { value: "conteste", label: "Contesté", icon: <AlertTriangle className="h-3.5 w-3.5" />, badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { value: "valide", label: "Validé", icon: <CheckCircle2 className="h-3.5 w-3.5" />, badge: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500" },
  { value: "negocie", label: "Négocié", icon: <BadgeCheck className="h-3.5 w-3.5" />, badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { value: "paye", label: "Payé", icon: <Banknote className="h-3.5 w-3.5" />, badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
];

const TYPES_COLLECTIVITE = ["commune", "region", "district"];

function getStatut(value: string) {
  return STATUTS.find((s) => s.value === value) ?? STATUTS[0];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(v: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fileUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
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

function generatePDF(ordres: OrdreDeRecettes[]) {
  const rows = ordres
    .map(
      (o) => `
    <tr>
      <td>${o.reference || "—"}</td>
      <td>${o.nomCollectivite}</td>
      <td>${o.commune}</td>
      <td>${formatDate(o.dateEmission)}</td>
      <td>${formatNumber(o.montantReclame)} FCFA</td>
      <td>${formatNumber(o.penalites)} FCFA</td>
      <td>${formatNumber(o.montantTotal)} FCFA</td>
      <td>${getStatut(o.statut).label}</td>
    </tr>`
    )
    .join("");

  const total = ordres.reduce((s, o) => s + o.montantTotal, 0);

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Ordres de Recettes — VisiTrack360</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #1e293b; }
        h1 { font-size: 18px; color: #0B3C53; margin-bottom: 4px; }
        p.sub { color: #64748b; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #0B3C53; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
        td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .total { font-weight: bold; background: #f1f5f9; }
        .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <h1>Synthèse — Ordres de Recettes</h1>
      <p class="sub">VisiTrack360 · Généré le ${new Date().toLocaleDateString("fr-FR")} · ${ordres.length} ordre(s)</p>
      <table>
        <thead>
          <tr>
            <th>Référence</th><th>Collectivité</th><th>Commune</th>
            <th>Date émission</th><th>Montant réclamé</th>
            <th>Pénalités</th><th>Total</th><th>Statut</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total">
            <td colspan="6" style="text-align:right; padding-right:8px;">TOTAL</td>
            <td>${formatNumber(total)} FCFA</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <p class="footer">Document généré par VisiTrack360 — LanfiaTech / LMC © 2025</p>
    </body>
    </html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
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

const ACTIVE_HREF = "/ordres-de-recettes";

// ---------------------------------------------------------------------------
// Composants UI locaux
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
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
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
  value,
  onChange,
  options,
  placeholder,
  isLoading = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  isLoading?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53] disabled:opacity-60"
      disabled={isLoading}
    >
      {placeholder && <option value="">{isLoading ? "Chargement..." : placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Formulaire vide
// ---------------------------------------------------------------------------

function emptyForm() {
  return {
    typeCollectivite: "commune",
    nomCollectivite: "",
    commune: "",
    region: "",
    district: "",
    interlocuteur: "",
    reference: "",
    dateEmission: "",
    periodeDebut: "",
    periodeFin: "",
    montantReclame: "",
    penalites: "0",
    fraisAnnexes: "0",
    nombreSupportsFactures: "0",
    typeSupportFacture: "",
    surfaceFacturee: "",
    localiteFacturee: "",
    statut: "recu" as Statut,
    prochaineAction: "",
    commentaire: "",
    pieceJointeFile: null as File | null,
    responsable: "",
  };
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function OrdresDeRecettesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [ordres, setOrdres] = useState<OrdreDeRecettes[]>([]);
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État pour les listes déroulantes
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingSelects, setIsLoadingSelects] = useState(true);

  // Filtres
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCommune, setFilterCommune] = useState("");

  // Modal CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrdreDeRecettes | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal détail
  const [detailModal, setDetailModal] = useState<OrdreDeRecettes | null>(null);

  // Modal changement statut
  const [statutModal, setStatutModal] = useState<OrdreDeRecettes | null>(null);
  const [newStatut, setNewStatut] = useState<Statut>("recu");

  // Modal suppression
  const [deleteTarget, setDeleteTarget] = useState<OrdreDeRecettes | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  // Charger les données pour les listes déroulantes
  useEffect(() => {
    const loadSelectData = async () => {
      if (!user) return;
      setIsLoadingSelects(true);
      try {
        const [communesRes, regionsRes, districtsRes, agentsRes] = await Promise.all([
          apiFetch<PaginatedResponse<Commune> | Commune[]>("/api/geo/communes/?is_active=true"),
          apiFetch<PaginatedResponse<Region> | Region[]>("/api/geo/regions/?is_active=true"),
          apiFetch<PaginatedResponse<District> | District[]>("/api/geo/districts/?is_active=true"),
          apiFetch<PaginatedResponse<Agent> | Agent[]>("/api/users/?role=AGENT&is_active=true"),
        ]);

        setCommunes(Array.isArray(communesRes) ? communesRes : communesRes.results || []);
        setRegions(Array.isArray(regionsRes) ? regionsRes : regionsRes.results || []);
        setDistricts(Array.isArray(districtsRes) ? districtsRes : districtsRes.results || []);
        setAgents(Array.isArray(agentsRes) ? agentsRes : agentsRes.results || []);
      } catch (error) {
        console.error("Erreur chargement listes déroulantes:", error);
      } finally {
        setIsLoadingSelects(false);
      }
    };

    loadSelectData();
  }, [user]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filterStatut) p.set("statut", filterStatut);
    if (filterType) p.set("type_collectivite", filterType);
    if (filterCommune) p.set("commune", filterCommune);
    if (search) p.set("search", search);
    return p.toString();
  }, [filterStatut, filterType, filterCommune, search]);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [ordresData, statsData] = await Promise.all([
        apiFetch<PaginatedResponse<OrdreDeRecettes> | OrdreDeRecettes[]>(
          `/api/ordres-recettes/?${queryString}`
        ),
        apiFetch<Statistiques>("/api/ordres-recettes/statistiques/"),
      ]);
      setOrdres(Array.isArray(ordresData) ? ordresData : ordresData.results);
      setStats(statsData);
    } catch {
      setError("Impossible de charger les ordres de recettes.");
    } finally {
      setIsLoading(false);
    }
  }, [user, queryString]);

  useEffect(() => { load(); }, [load]);

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(o: OrdreDeRecettes) {
    setEditing(o);
    setForm({
      typeCollectivite: o.typeCollectivite,
      nomCollectivite: o.nomCollectivite,
      commune: o.commune,
      region: o.region,
      district: o.district,
      interlocuteur: o.interlocuteur,
      reference: o.reference,
      dateEmission: o.dateEmission ?? "",
      periodeDebut: o.periodeDebut ?? "",
      periodeFin: o.periodeFin ?? "",
      montantReclame: String(o.montantReclame),
      penalites: String(o.penalites),
      fraisAnnexes: String(o.fraisAnnexes),
      nombreSupportsFactures: String(o.nombreSupportsFactures),
      typeSupportFacture: o.typeSupportFacture,
      surfaceFacturee: o.surfaceFacturee ? String(o.surfaceFacturee) : "",
      localiteFacturee: o.localiteFacturee,
      statut: o.statut,
      prochaineAction: o.prochaineAction,
      commentaire: o.commentaire,
      pieceJointeFile: null,
      responsable: o.responsable ? String(o.responsable) : "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Nettoyer les données
      const cleanMontantReclame = parseFloat(form.montantReclame) || 0;
      const cleanPenalites = parseFloat(form.penalites) || 0;
      const cleanFraisAnnexes = parseFloat(form.fraisAnnexes) || 0;
      const cleanNombreSupports = parseInt(form.nombreSupportsFactures) || 0;
      const cleanSurface = form.surfaceFacturee ? parseFloat(form.surfaceFacturee) : null;

      // Créer l'objet avec les bons noms de champs (camelCase attendu par le serializer)
      const data: Record<string, any> = {
        typeCollectivite: form.typeCollectivite,
        nomCollectivite: form.nomCollectivite,
        commune: form.commune || "",
        region: form.region || "",
        district: form.district || "",
        interlocuteur: form.interlocuteur || "",
        reference: form.reference || "",
        dateEmission: form.dateEmission || null,
        periodeDebut: form.periodeDebut || null,
        periodeFin: form.periodeFin || null,
        montantReclame: cleanMontantReclame,
        penalites: cleanPenalites,
        fraisAnnexes: cleanFraisAnnexes,
        nombreSupportsFactures: cleanNombreSupports,
        typeSupportFacture: form.typeSupportFacture || "",
        surfaceFacturee: cleanSurface,
        localiteFacturee: form.localiteFacturee || "",
        statut: form.statut,
        prochaineAction: form.prochaineAction || "",
        commentaire: form.commentaire || "",
      };

      // Ajouter le responsable si sélectionné
      if (form.responsable) {
        data.responsable = parseInt(form.responsable);
      }

      // Si une pièce jointe est présente, utiliser FormData
      let body: BodyInit;
      let headers: Record<string, string> = {};
      
      const token = getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      if (form.pieceJointeFile) {
        // Utiliser FormData pour le fichier
        const fd = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            fd.append(key, String(value));
          }
        });
        fd.append("pieceJointe", form.pieceJointeFile);
        body = fd;
        // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement)
      } else {
        // Utiliser JSON
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(data);
      }

      const url = editing
        ? `${BASE_URL}/api/ordres-recettes/${editing.id}/`
        : `${BASE_URL}/api/ordres-recettes/`;
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, { method, headers, body });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Erreur détaillée:", errorData);
        
        // Afficher les erreurs spécifiques
        if (errorData && typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          alert(`Erreur de validation:\n${errorMessages}`);
        } else {
          alert(`Erreur ${res.status}: ${res.statusText}`);
        }
        throw new Error("Erreur serveur");
      }
      
      const saved: OrdreDeRecettes = await res.json();

      if (editing) {
        setOrdres((prev) => prev.map((o) => o.id === saved.id ? saved : o));
      } else {
        setOrdres((prev) => [saved, ...prev]);
      }
      setModalOpen(false);
      load(); // Recharger les stats
    } catch (error) {
      console.error("Erreur:", error);
      if (!(error instanceof Error && error.message === "Erreur serveur")) {
        alert("Erreur lors de la sauvegarde. Veuillez réessayer.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangerStatut() {
    if (!statutModal) return;
    try {
      const updated = await apiFetch<OrdreDeRecettes>(
        `/api/ordres-recettes/${statutModal.id}/changer_statut/`,
        { method: "POST", body: JSON.stringify({ statut: newStatut }) }
      );
      setOrdres((prev) => prev.map((o) => o.id === updated.id ? updated : o));
      setStatutModal(null);
      load();
    } catch {
      alert("Erreur lors du changement de statut.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/ordres-recettes/${deleteTarget.id}/`, { method: "DELETE" });
      setOrdres((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      load();
    } catch {
      alert("Erreur lors de la suppression.");
    }
  }

  function handleExportCSV() {
    exportCSV(
      ordres.map((o) => ({
        Référence: o.reference || "—",
        Collectivité: o.nomCollectivite,
        Type: o.typeCollectivite,
        Commune: o.commune,
        "Date émission": formatDate(o.dateEmission),
        "Période début": formatDate(o.periodeDebut),
        "Période fin": formatDate(o.periodeFin),
        "Montant réclamé (FCFA)": o.montantReclame,
        "Pénalités (FCFA)": o.penalites,
        "Frais annexes (FCFA)": o.fraisAnnexes,
        "Montant total (FCFA)": o.montantTotal,
        "Supports facturés": o.nombreSupportsFactures,
        "Type support": o.typeSupportFacture,
        Statut: getStatut(o.statut).label,
        "Prochaine action": o.prochaineAction,
        Commentaire: o.commentaire,
      })),
      "ordres_de_recettes"
    );
  }

  const communesList = useMemo(
    () => [...new Set(ordres.map((o) => o.commune).filter(Boolean))],
    [ordres]
  );

  // Options pour les select
  const communeOptions = useMemo(() => {
    return communes.map((c) => ({ value: c.nom, label: c.nom }));
  }, [communes]);

  const regionOptions = useMemo(() => {
    return regions.map((r) => ({ value: r.nom, label: r.nom }));
  }, [regions]);

  const districtOptions = useMemo(() => {
    return districts.map((d) => ({ value: d.nom, label: d.nom }));
  }, [districts]);

  const agentOptions = useMemo(() => {
    return agents.map((a) => ({ 
      value: String(a.id), 
      label: a.nomComplet || `${a.prenom} ${a.nom}` 
    }));
  }, [agents]);

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
                    <Link
                      key={item.href}
                      href={item.href}
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
            <h2 className="text-[15px] font-bold text-slate-900">Ordres de recettes</h2>
            <p className="text-[12px] text-slate-400">Gestion · Suivi · Analyse</p>
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
          {/* Titre */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="border-l-4 border-[#0B3C53] pl-3">
              <h1 className="text-2xl font-bold text-slate-900">Ordres de recettes</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Enregistrement, suivi et analyse des ordres reçus des collectivités.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => generatePDF(ordres)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                PDF synthèse
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#0B3C53]/90"
              >
                <Plus className="h-4 w-4" />
                Nouvel ordre
              </button>
            </div>
          </div>

          {/* KPIs statistiques */}
          {stats && (
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Total ordres
                </p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Montant total réclamé
                </p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {formatNumber(stats.montantTotal)}{" "}
                  <span className="text-sm font-normal text-slate-400">FCFA</span>
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Pénalités totales
                </p>
                <p className="text-2xl font-bold tabular-nums text-red-600">
                  {formatNumber(stats.penalitesTotal)}{" "}
                  <span className="text-sm font-normal text-slate-400">FCFA</span>
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Répartition par statut
                </p>
                <div className="flex flex-wrap gap-1">
                  {stats.parStatut.map((s) => {
                    const st = getStatut(s.statut);
                    return (
                      <span key={s.statut} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label} ({s.count})
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Pipeline statuts */}
          <div className="mb-6 flex items-center gap-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {STATUTS.map((s, i) => {
              const count = ordres.filter((o) => o.statut === s.value).length;
              const isActive = filterStatut === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setFilterStatut(isActive ? "" : s.value)}
                  className={`flex flex-1 shrink-0 flex-col items-center gap-1 border-r border-slate-100 px-4 py-3.5 text-[12px] transition-colors last:border-r-0 ${
                    isActive ? "bg-[#0B3C53]/5" : "hover:bg-slate-50"
                  }`}
                >
                  <div className={`flex items-center gap-1.5 font-semibold ${isActive ? "text-[#0B3C53]" : "text-slate-600"}`}>
                    {s.icon}
                    {s.label}
                  </div>
                  <span className={`text-[18px] font-bold tabular-nums ${count > 0 ? "text-slate-900" : "text-slate-300"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtres */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Référence, collectivité, commune..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
            >
              <option value="">Tous types</option>
              {TYPES_COLLECTIVITE.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <select
              value={filterCommune}
              onChange={(e) => setFilterCommune(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-[#0B3C53]"
            >
              <option value="">Toutes communes</option>
              {communesList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => { setSearch(""); setFilterStatut(""); setFilterType(""); setFilterCommune(""); }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Réinitialiser
            </button>
          </div>

          {/* État */}
          {isLoading && (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" />
            </div>
          )}
          {error && !isLoading && (
            <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-[13px] text-red-700">{error}</p>
              <button onClick={load} className="ml-auto text-[13px] font-semibold text-red-700 underline">Réessayer</button>
            </div>
          )}

          {/* Tableau */}
          {!isLoading && !error && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <p className="text-[13px] font-medium text-slate-500">
                  {ordres.length} ordre{ordres.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Référence</th>
                      <th className="px-3 py-2.5">Collectivité</th>
                      <th className="px-3 py-2.5">Commune</th>
                      <th className="px-3 py-2.5">Date émission</th>
                      <th className="px-3 py-2.5">Période</th>
                      <th className="px-3 py-2.5">Montant réclamé</th>
                      <th className="px-3 py-2.5">Total</th>
                      <th className="px-3 py-2.5">PJ</th>
                      <th className="px-3 py-2.5">Statut</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordres.map((o) => {
                      const st = getStatut(o.statut);
                      const pj = fileUrl(o.pieceJointe);
                      return (
                        <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <p className="font-semibold text-slate-800">{o.reference || `ORD-${o.id}`}</p>
                            <p className="text-[11px] text-slate-400">{o.typeCollectivite}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-slate-700">{o.nomCollectivite}</p>
                            {o.interlocuteur && (
                              <p className="text-[11px] text-slate-400">{o.interlocuteur}</p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-600">{o.commune || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(o.dateEmission)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-[12px] text-slate-500">
                            {o.periodeDebut && o.periodeFin
                              ? `${formatDate(o.periodeDebut)} → ${formatDate(o.periodeFin)}`
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">
                            {formatNumber(o.montantReclame)} FCFA
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-bold text-[#0B3C53]">
                            {formatNumber(o.montantTotal)} FCFA
                          </td>
                          <td className="px-3 py-3">
                            {pj ? (
                              <a
                                href={pj}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                                title="Voir la pièce jointe"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-300">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <button
                              onClick={() => { setStatutModal(o); setNewStatut(o.statut); }}
                              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition hover:opacity-80 ${st.badge}`}
                            >
                              {st.icon}
                              {st.label}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setDetailModal(o)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                title="Détail"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEdit(o)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(o)}
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
                    {ordres.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                          Aucun ordre de recettes trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ===================== MODAL CRUD ===================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-[16px] font-bold text-slate-900">
                {editing ? "Modifier l'ordre" : "Nouvel ordre de recettes"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="ordre-form" onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Collectivité */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Collectivité</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Type *">
                    <SelectInput
                      value={form.typeCollectivite}
                      onChange={(v) => setForm((f) => ({ ...f, typeCollectivite: v }))}
                      options={TYPES_COLLECTIVITE.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                    />
                  </FormField>
                  <FormField label="Nom collectivité *">
                    <TextInput value={form.nomCollectivite} onChange={(v) => setForm((f) => ({ ...f, nomCollectivite: v }))} required />
                  </FormField>
                  <FormField label="Commune">
                    <SelectInput
                      value={form.commune}
                      onChange={(v) => setForm((f) => ({ ...f, commune: v }))}
                      options={communeOptions}
                      placeholder="Sélectionner une commune"
                      isLoading={isLoadingSelects}
                    />
                  </FormField>
                  <FormField label="Région">
                    <SelectInput
                      value={form.region}
                      onChange={(v) => setForm((f) => ({ ...f, region: v }))}
                      options={regionOptions}
                      placeholder="Sélectionner une région"
                      isLoading={isLoadingSelects}
                    />
                  </FormField>
                  <FormField label="District">
                    <SelectInput
                      value={form.district}
                      onChange={(v) => setForm((f) => ({ ...f, district: v }))}
                      options={districtOptions}
                      placeholder="Sélectionner un district"
                      isLoading={isLoadingSelects}
                    />
                  </FormField>
                  <FormField label="Interlocuteur">
                    <TextInput value={form.interlocuteur} onChange={(v) => setForm((f) => ({ ...f, interlocuteur: v }))} />
                  </FormField>
                </div>
              </div>

              {/* Document */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Document</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Référence">
                    <TextInput value={form.reference} onChange={(v) => setForm((f) => ({ ...f, reference: v }))} placeholder="ex: ORD-2026-001" />
                  </FormField>
                  <FormField label="Date d'émission">
                    <TextInput type="date" value={form.dateEmission} onChange={(v) => setForm((f) => ({ ...f, dateEmission: v }))} />
                  </FormField>
                  <FormField label="Statut">
                    <SelectInput
                      value={form.statut}
                      onChange={(v) => setForm((f) => ({ ...f, statut: v as Statut }))}
                      options={STATUTS.map((s) => ({ value: s.value, label: s.label }))}
                    />
                  </FormField>
                  <FormField label="Période début">
                    <TextInput type="date" value={form.periodeDebut} onChange={(v) => setForm((f) => ({ ...f, periodeDebut: v }))} />
                  </FormField>
                  <FormField label="Période fin">
                    <TextInput type="date" value={form.periodeFin} onChange={(v) => setForm((f) => ({ ...f, periodeFin: v }))} />
                  </FormField>
                  <FormField label="Responsable">
                    <SelectInput
                      value={form.responsable}
                      onChange={(v) => setForm((f) => ({ ...f, responsable: v }))}
                      options={agentOptions}
                      placeholder="Assigner un responsable"
                      isLoading={isLoadingSelects}
                    />
                  </FormField>
                  <FormField label="Pièce jointe (PDF/Excel/image)">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-2 text-[13px] font-medium text-slate-500 hover:border-[#0B3C53] hover:bg-slate-100"
                      >
                        <Upload className="h-4 w-4" />
                        {form.pieceJointeFile ? form.pieceJointeFile.name : "Importer"}
                      </button>
                      {editing?.pieceJointe && !form.pieceJointeFile && (
                        <a href={fileUrl(editing.pieceJointe) ?? "#"} target="_blank" rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                          <Eye className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setForm((f) => ({ ...f, pieceJointeFile: file }));
                      }}
                    />
                  </FormField>
                </div>
              </div>

              {/* Montants */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Montants (FCFA)</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Montant réclamé *">
                    <TextInput type="number" value={form.montantReclame} onChange={(v) => setForm((f) => ({ ...f, montantReclame: v }))} required />
                  </FormField>
                  <FormField label="Pénalités">
                    <TextInput type="number" value={form.penalites} onChange={(v) => setForm((f) => ({ ...f, penalites: v }))} />
                  </FormField>
                  <FormField label="Frais annexes">
                    <TextInput type="number" value={form.fraisAnnexes} onChange={(v) => setForm((f) => ({ ...f, fraisAnnexes: v }))} />
                  </FormField>
                </div>
                {(form.montantReclame || form.penalites || form.fraisAnnexes) && (
                  <div className="mt-3 flex items-center justify-end rounded-lg bg-[#0B3C53]/5 px-4 py-2">
                    <span className="text-[13px] text-slate-500">Total estimé :</span>
                    <span className="ml-2 text-[14px] font-bold text-[#0B3C53]">
                      {formatNumber(
                        (parseFloat(form.montantReclame) || 0) +
                        (parseFloat(form.penalites) || 0) +
                        (parseFloat(form.fraisAnnexes) || 0)
                      )} FCFA
                    </span>
                  </div>
                )}
              </div>

              {/* Supports facturés */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Supports facturés</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Nombre de supports">
                    <TextInput type="number" value={form.nombreSupportsFactures} onChange={(v) => setForm((f) => ({ ...f, nombreSupportsFactures: v }))} />
                  </FormField>
                  <FormField label="Type de support">
                    <TextInput value={form.typeSupportFacture} onChange={(v) => setForm((f) => ({ ...f, typeSupportFacture: v }))} />
                  </FormField>
                  <FormField label="Surface facturée (m²)">
                    <TextInput type="number" value={form.surfaceFacturee} onChange={(v) => setForm((f) => ({ ...f, surfaceFacturee: v }))} />
                  </FormField>
                  <div className="col-span-3">
                    <FormField label="Localité facturée">
                      <TextInput value={form.localiteFacturee} onChange={(v) => setForm((f) => ({ ...f, localiteFacturee: v }))} placeholder="ex: Plateau, Zone 4..." />
                    </FormField>
                  </div>
                </div>
              </div>

              {/* Suivi */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Suivi</p>
                <div className="grid grid-cols-1 gap-4">
                  <FormField label="Prochaine action">
                    <TextInput value={form.prochaineAction} onChange={(v) => setForm((f) => ({ ...f, prochaineAction: v }))} placeholder="ex: Envoyer courrier de contestation..." />
                  </FormField>
                  <FormField label="Commentaire">
                    <textarea
                      value={form.commentaire}
                      onChange={(e) => setForm((f) => ({ ...f, commentaire: e.target.value }))}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-[#0B3C53]"
                    />
                  </FormField>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button
                form="ordre-form"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Enregistrer les modifications" : "Créer l'ordre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DÉTAIL ===================== */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-[16px] font-bold text-slate-900">
                  {detailModal.reference || `Ordre #${detailModal.id}`}
                </h2>
                <p className="text-[12px] text-slate-400">{detailModal.nomCollectivite}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Statut */}
              <div className="flex items-center gap-3">
                {(() => {
                  const st = getStatut(detailModal.statut);
                  return (
                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold ${st.badge}`}>
                      {st.icon}
                      {st.label}
                    </span>
                  );
                })()}
                {detailModal.prochaineAction && (
                  <p className="text-[13px] text-slate-500">
                    → {detailModal.prochaineAction}
                  </p>
                )}
              </div>

              {/* Montants */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Montant réclamé", value: `${formatNumber(detailModal.montantReclame)} FCFA`, color: "text-violet-600" },
                  { label: "Pénalités", value: `${formatNumber(detailModal.penalites)} FCFA`, color: "text-red-600" },
                  { label: "Total", value: `${formatNumber(detailModal.montantTotal)} FCFA`, color: "text-[#0B3C53] font-bold" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-1 text-[11px] text-slate-400">{item.label}</p>
                    <p className={`text-[14px] ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Infos */}
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                {[
                  ["Type collectivité", detailModal.typeCollectivite],
                  ["Commune", detailModal.commune || "—"],
                  ["Interlocuteur", detailModal.interlocuteur || "—"],
                  ["Date émission", formatDate(detailModal.dateEmission)],
                  ["Période", detailModal.periodeDebut ? `${formatDate(detailModal.periodeDebut)} → ${formatDate(detailModal.periodeFin)}` : "—"],
                  ["Supports facturés", String(detailModal.nombreSupportsFactures)],
                  ["Type support", detailModal.typeSupportFacture || "—"],
                  ["Surface facturée", detailModal.surfaceFacturee ? `${detailModal.surfaceFacturee} m²` : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-medium text-slate-800">{value}</span>
                  </div>
                ))}
              </div>

              {detailModal.commentaire && (
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Commentaire</p>
                  <p className="text-[13px] text-slate-700">{detailModal.commentaire}</p>
                </div>
              )}

              {detailModal.pieceJointe && (
                <a
                  href={fileUrl(detailModal.pieceJointe) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] font-medium text-blue-700 hover:bg-blue-100"
                >
                  <FileText className="h-4 w-4" />
                  Voir la pièce jointe
                </a>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={() => { setDetailModal(null); openEdit(detailModal); }} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
              <button onClick={() => setDetailModal(null)} className="rounded-lg bg-[#0B3C53] px-4 py-2 text-[13px] font-semibold text-white">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL CHANGEMENT STATUT ===================== */}
      {statutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <Filter className="h-5 w-5 text-[#0B3C53]" />
              <h3 className="text-[15px] font-bold text-slate-900">Changer le statut</h3>
            </div>
            <p className="mb-4 text-[13px] text-slate-500">
              <span className="font-medium text-slate-700">{statutModal.reference || statutModal.nomCollectivite}</span>
            </p>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {STATUTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setNewStatut(s.value)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold transition ${
                    newStatut === s.value
                      ? "ring-2 ring-[#0B3C53] ring-offset-1 " + s.badge
                      : s.badge + " opacity-60 hover:opacity-100"
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStatutModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={handleChangerStatut} className="rounded-lg bg-[#0B3C53] px-4 py-2 text-[13px] font-semibold text-white">
                Confirmer
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
            <h3 className="mb-1.5 text-[15px] font-bold text-slate-900">Supprimer cet ordre ?</h3>
            <p className="mb-5 text-[13px] text-slate-500">
              <span className="font-medium text-slate-700">
                {deleteTarget.reference || deleteTarget.nomCollectivite}
              </span>{" "}
              sera définitivement supprimé.
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