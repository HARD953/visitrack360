"use client";

/**
 * BulkImportModal.tsx
 * Composant d'import en masse de supports publicitaires
 * via CSV ou Excel (.xlsx).
 *
 * Intégration dans la page parent :
 *
 *   import BulkImportModal from "@/components/BulkImportModal";
 *
 *   <BulkImportModal
 *     open={importModalOpen}
 *     onClose={() => setImportModalOpen(false)}
 *     onImported={() => { setImportModalOpen(false); loadSupports(); }}
 *   />
 *
 * Ajouter aussi le bouton déclencheur dans l'en-tête :
 *   <button onClick={() => setImportModalOpen(true)} ...>
 *     <Upload className="h-4 w-4" /> Importer
 *   </button>
 */

import {
  useState,
  useRef,
  useCallback,
  type DragEvent,
  type ChangeEvent,
} from "react";
import * as XLSX from "xlsx";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { getAccessToken } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://backend360.onrender.com";

// ---------------------------------------------------------------------------
// Colonnes attendues dans le fichier (ordre recommandé pour le template)
// ---------------------------------------------------------------------------

export const IMPORT_COLUMNS = [
  { key: "marque",              label: "Marque",                   required: true,  type: "string" },
  { key: "entreprise",          label: "Entreprise",               required: false, type: "string" },
  { key: "nomSite",             label: "Nom du site",              required: false, type: "string" },
  { key: "commune",             label: "Commune",                  required: false, type: "string" },
  { key: "quartier",            label: "Quartier",                 required: false, type: "string" },
  { key: "ville",               label: "Ville",                    required: false, type: "string" },
  { key: "region",              label: "Région",                   required: false, type: "string" },
  { key: "district",            label: "District",                 required: false, type: "string" },
  { key: "village",             label: "Village",                  required: false, type: "string" },
  { key: "latitude",            label: "Latitude",                 required: false, type: "number" },
  { key: "longitude",           label: "Longitude",                required: false, type: "number" },
  { key: "typeSupport",         label: "Type de support",          required: false, type: "string" },
  { key: "canal",               label: "Canal",                    required: false, type: "string" },
  { key: "surface",             label: "Surface (m²)",             required: false, type: "number" },
  { key: "nombreSupport",       label: "Nombre de supports",       required: true,  type: "number" },
  { key: "nombreFace",          label: "Nombre de faces",          required: false, type: "number" },
  { key: "surfaceODP",          label: "Surface ODP",              required: true,  type: "number" },
  { key: "etatSupport",         label: "État (Bon/Défraichi/Détérioré)", required: false, type: "string" },
  { key: "typeSite",            label: "Type de site",             required: true,  type: "string" },
  { key: "visibilite",          label: "Visibilité",               required: false, type: "string" },
  { key: "duree",               label: "Durée (mois)",             required: false, type: "number" },
  { key: "tsp",                 label: "TSP (FCFA)",               required: false, type: "number" },
  { key: "odpValue",            label: "Valeur ODP (FCFA)",        required: false, type: "number" },
  { key: "responsableNom",      label: "Responsable – Nom",        required: true,  type: "string" },
  { key: "responsablePrenom",   label: "Responsable – Prénom",     required: true,  type: "string" },
  { key: "responsableContact",  label: "Responsable – Contact",    required: true,  type: "string" },
  { key: "signataireNom",       label: "Signataire – Nom",         required: true,  type: "string" },
  { key: "signatairePrenom",    label: "Signataire – Prénom",      required: true,  type: "string" },
  { key: "signataireContact",   label: "Signataire – Contact",     required: true,  type: "string" },
  { key: "description",         label: "Description",              required: false, type: "string" },
  { key: "observation",         label: "Observation",              required: false, type: "string" },
] as const;

type ColKey = (typeof IMPORT_COLUMNS)[number]["key"];

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

export type RowStatus = "pending" | "uploading" | "success" | "error";

export interface ImportRow {
  _rowIndex: number;
  _status: RowStatus;
  _error: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseValue(raw: unknown, type: "string" | "number"): unknown {
  if (raw === null || raw === undefined || raw === "") return type === "number" ? null : "";
  if (type === "number") {
    const n = Number(raw);
    return isNaN(n) ? null : n;
  }
  return String(raw).trim();
}

function validateRow(row: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const col of IMPORT_COLUMNS) {
    if (col.required) {
      const v = row[col.key];
      if (v === null || v === undefined || v === "") {
        errors.push(`"${col.label}" est obligatoire`);
      }
    }
  }
  return errors;
}

/** Transforme une feuille XLSX en tableau de Record */
function sheetToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return json;
}

/** Mappe les en-têtes du fichier vers les clés internes (tolérant aux casses / accents) */
function normaliseHeader(header: string): ColKey | null {
  const h = header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const col of IMPORT_COLUMNS) {
    const lbl = col.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = col.key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h === lbl || h === key) return col.key;
  }
  return null;
}

/** Construit le template de téléchargement */
function buildTemplate(): void {
  const headers = IMPORT_COLUMNS.map((c) => c.label);
  const example: (string | number)[] = [
    "MTN","MTN CI","Siège social Marcory","Marcory","Zone 4","Abidjan",
    "Abidjan","Abidjan","Abidjan",5.3247,-4.0187,"Panneau","Affichage",
    12,1,2,0,"Bon","Permanent","Bonne",12,150000,0,
    "Koné","Amadou","0700000000","Diallo","Ibrahim","0600000000",
    "Panneau principal","RAS",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  // Largeur colonnes
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Supports");
  XLSX.writeFile(wb, "template_supports_publicitaires.xlsx");
}

/** Upload une seule ligne vers l'API */
async function uploadRow(row: Record<string, unknown>): Promise<void> {
  const fd = new FormData();
  for (const col of IMPORT_COLUMNS) {
    const v = row[col.key];
    if (v !== null && v !== undefined && v !== "") {
      fd.append(col.key, String(v));
    }
  }
  // Defaults
  if (!fd.has("nombreSupport")) fd.append("nombreSupport", "1");
  if (!fd.has("nombreFace")) fd.append("nombreFace", "1");
  if (!fd.has("surfaceODP")) fd.append("surfaceODP", "0");
  if (!fd.has("etatSupport")) fd.append("etatSupport", "Bon");
  if (!fd.has("visibilite")) fd.append("visibilite", "Bonne");
  if (!fd.has("ville")) fd.append("ville", "Abidjan");
  if (!fd.has("region")) fd.append("region", "Abidjan");
  if (!fd.has("district")) fd.append("district", "Abidjan");
  if (!fd.has("village")) fd.append("village", "Abidjan");

  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api/supports/`, {
    method: "POST",
    headers,
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Object.values(err).flat().join(", ") || `Erreur HTTP ${res.status}`;
    throw new Error(msg);
  }
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = "upload" | "preview" | "importing" | "done";

export default function BulkImportModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Reset complet
  function reset() {
    setStep("upload");
    setRows([]);
    setFileName(null);
    setParseError(null);
    setProgress({ done: 0, total: 0, errors: 0 });
    setShowErrors(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // ---- Lecture fichier
  function parseFile(file: File) {
    setParseError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      setParseError("Format non supporté. Veuillez utiliser CSV ou Excel (.xlsx / .xls).");
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = sheetToRows(sheet);

        if (raw.length === 0) {
          setParseError("Le fichier est vide ou ne contient aucune ligne de données.");
          return;
        }

        // Mapper les en-têtes
        const firstRowKeys = Object.keys(raw[0]);
        const keyMap: Record<string, ColKey> = {};
        firstRowKeys.forEach((k) => {
          const mapped = normaliseHeader(k);
          if (mapped) keyMap[k] = mapped;
        });

        const parsed: ImportRow[] = raw.map((rawRow, i) => {
          const mapped: Record<string, unknown> = {};
          Object.entries(rawRow).forEach(([k, v]) => {
            const col = IMPORT_COLUMNS.find(
              (c) => keyMap[k] === c.key
            );
            if (col) {
              mapped[col.key] = parseValue(v, col.type);
            }
          });
          const validationErrors = validateRow(mapped);
          return {
            ...mapped,
            _rowIndex: i + 2, // ligne Excel (1-indexé + en-tête)
            _status: validationErrors.length > 0 ? "error" : "pending",
            _error: validationErrors.length > 0 ? validationErrors.join(" · ") : null,
          };
        });

        setRows(parsed);
        setStep("preview");
      } catch {
        setParseError("Impossible de lire le fichier. Vérifiez qu'il n'est pas corrompu.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  }, []);

  // ---- Supprimer une ligne invalide
  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  // ---- Lancer l'import
  async function startImport() {
    const validRows = rows.filter((r) => r._status !== "error");
    setProgress({ done: 0, total: validRows.length, errors: 0 });
    setStep("importing");

    // Mettre à jour le statut dans la liste
    setRows((prev) =>
      prev.map((r) =>
        r._status === "pending" ? { ...r, _status: "uploading" } : r
      )
    );

    let done = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row._status === "error") continue;

      try {
        await uploadRow(row as Record<string, unknown>);
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, _status: "success", _error: null } : r
          )
        );
        done++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, _status: "error", _error: msg } : r
          )
        );
        errors++;
        done++;
      }

      setProgress({ done, total: validRows.length, errors });
    }

    setStep("done");
  }

  if (!open) return null;

  // ---- Stats aperçu
  const validCount = rows.filter((r) => r._status !== "error" || r._error?.startsWith("Erreur HTTP") || r._error?.startsWith("Erreur")).length;
  const invalidCount = rows.filter((r) => r._status === "error").length;
  const pendingValid = rows.filter((r) => r._status === "pending").length;

  // ---- Stats fin
  const successCount = rows.filter((r) => r._status === "success").length;
  const errorCount = rows.filter((r) => r._status === "error").length;

  const progressPercent =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B3C53]/10">
              <FileSpreadsheet className="h-5 w-5 text-[#0B3C53]" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Import en masse</h2>
              <p className="text-[11px] text-slate-400">
                CSV ou Excel · jusqu'à 500 lignes par fichier
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Corps scrollable ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ======== ÉTAPE 1 : UPLOAD ======== */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Template */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <div className="text-[13px] text-blue-800">
                  <p className="font-semibold">Commencez par le modèle</p>
                  <p className="mt-0.5 text-blue-700">
                    Téléchargez le fichier modèle, remplissez-le et importez-le ici.
                    Les colonnes marquées <span className="font-semibold">*</span> sont obligatoires.
                  </p>
                </div>
                <button
                  onClick={buildTemplate}
                  className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0B3C53] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0B3C53]/90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Modèle Excel
                </button>
              </div>

              {/* Zone de dépôt */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-14 text-center transition-colors ${
                  isDragging
                    ? "border-[#0B3C53] bg-[#0B3C53]/5"
                    : "border-slate-200 bg-slate-50 hover:border-[#0B3C53]/50 hover:bg-slate-100"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
                  <Upload className="h-6 w-6 text-slate-500" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-slate-700">
                    Glissez votre fichier ici
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-400">
                    ou cliquez pour parcourir — CSV, XLSX, XLS
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileInput}
              />

              {parseError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Référence colonnes */}
              <details className="group rounded-xl border border-slate-200">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                  <span>Référence des colonnes attendues</span>
                  <ChevronDown className="h-4 w-4 text-slate-400 group-open:hidden" />
                  <ChevronUp className="hidden h-4 w-4 text-slate-400 group-open:block" />
                </summary>
                <div className="overflow-x-auto border-t border-slate-100">
                  <table className="w-full min-w-[420px] text-[12px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-2">Colonne</th>
                        <th className="px-3 py-2">Clé interne</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Requis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {IMPORT_COLUMNS.map((col) => (
                        <tr key={col.key} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-1.5 font-medium text-slate-700">{col.label}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-500">{col.key}</td>
                          <td className="px-3 py-1.5 text-slate-400">{col.type}</td>
                          <td className="px-3 py-1.5">
                            {col.required ? (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">Oui</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}

          {/* ======== ÉTAPE 2 : APERÇU ======== */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Résumé */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{fileName}</p>
                  <p className="text-[12px] text-slate-400">{rows.length} lignes lues</p>
                </div>
                <button
                  onClick={reset}
                  className="text-[12px] font-medium text-slate-400 hover:text-red-500"
                >
                  Changer de fichier
                </button>
              </div>

              {/* Badges de statut */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {pendingValid} valide{pendingValid > 1 ? "s" : ""}
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-700">
                    <XCircle className="h-3.5 w-3.5" />
                    {invalidCount} en erreur (ignorée{invalidCount > 1 ? "s" : ""})
                  </span>
                )}
              </div>

              {/* Tableau aperçu */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-[12px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        <th className="px-3 py-2.5">Ligne</th>
                        <th className="px-3 py-2.5">Marque</th>
                        <th className="px-3 py-2.5">Site</th>
                        <th className="px-3 py-2.5">Commune</th>
                        <th className="px-3 py-2.5">Type</th>
                        <th className="px-3 py-2.5">État</th>
                        <th className="px-3 py-2.5">Statut</th>
                        <th className="px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className={`border-b border-slate-100 last:border-0 ${row._status === "error" ? "bg-red-50/50" : "hover:bg-slate-50"}`}>
                          <td className="px-3 py-2 font-mono text-slate-400">{row._rowIndex}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{String(row.marque || "—")}</td>
                          <td className="px-3 py-2 text-slate-600">{String(row.nomSite || "—")}</td>
                          <td className="px-3 py-2 text-slate-600">{String(row.commune || "—")}</td>
                          <td className="px-3 py-2 text-slate-600">{String(row.typeSupport || "—")}</td>
                          <td className="px-3 py-2 text-slate-600">{String(row.etatSupport || "—")}</td>
                          <td className="px-3 py-2">
                            {row._status === "error" ? (
                              <span
                                title={row._error ?? ""}
                                className="inline-flex max-w-[180px] cursor-help items-center gap-1 truncate rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700"
                              >
                                <XCircle className="h-3 w-3 shrink-0" />
                                {row._error}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Prêt
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeRow(i)}
                              title="Supprimer cette ligne"
                              className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {invalidCount > 0 && (
                <p className="text-[12px] text-slate-500">
                  Les lignes en erreur seront automatiquement ignorées lors de l'import.
                  Corrigez le fichier source ou supprimez-les manuellement.
                </p>
              )}
            </div>
          )}

          {/* ======== ÉTAPE 3 : EN COURS ======== */}
          {step === "importing" && (
            <div className="space-y-5 py-4">
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-[#0B3C53]" />
                <p className="text-[15px] font-bold text-slate-900">Import en cours…</p>
                <p className="mt-1 text-[13px] text-slate-400">
                  {progress.done} / {progress.total} traités
                </p>
              </div>

              {/* Barre de progression */}
              <div className="overflow-hidden rounded-full bg-slate-100" style={{ height: 8 }}>
                <div
                  className="h-full rounded-full bg-[#0B3C53] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Mini-liste statuts */}
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {rows.filter((r) => r._status !== "error" || r._error?.startsWith("Erreur")).map((row, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg border border-slate-100 px-3 py-2">
                    {row._status === "uploading" && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
                    )}
                    {row._status === "success" && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                    {row._status === "error" && (
                      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                    )}
                    {row._status === "pending" && (
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-200" />
                    )}
                    <span className="flex-1 truncate text-[12px] font-medium text-slate-700">
                      Ligne {row._rowIndex} — {String(row.marque || "—")}
                    </span>
                    {row._status === "error" && (
                      <span className="text-[11px] text-red-500">{row._error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======== ÉTAPE 4 : RÉSULTAT ======== */}
          {step === "done" && (
            <div className="space-y-5 py-4">
              <div className="text-center">
                {errorCount === 0 ? (
                  <>
                    <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
                    <p className="text-[16px] font-bold text-slate-900">Import réussi !</p>
                    <p className="mt-1 text-[13px] text-slate-400">
                      {successCount} support{successCount > 1 ? "s" : ""} créé{successCount > 1 ? "s" : ""} avec succès.
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="mx-auto mb-3 h-12 w-12 text-amber-500" />
                    <p className="text-[16px] font-bold text-slate-900">Import terminé avec des erreurs</p>
                    <p className="mt-1 text-[13px] text-slate-400">
                      {successCount} réussi{successCount > 1 ? "s" : ""} · {errorCount} échoué{errorCount > 1 ? "s" : ""}
                    </p>
                  </>
                )}
              </div>

              {/* Tuiles résumé */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{successCount}</p>
                  <p className="text-[12px] text-emerald-600">Créés avec succès</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${errorCount > 0 ? "border-red-100 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
                  <p className={`text-2xl font-bold ${errorCount > 0 ? "text-red-700" : "text-slate-400"}`}>{errorCount}</p>
                  <p className={`text-[12px] ${errorCount > 0 ? "text-red-600" : "text-slate-400"}`}>Erreurs</p>
                </div>
              </div>

              {/* Détail erreurs */}
              {errorCount > 0 && (
                <div>
                  <button
                    onClick={() => setShowErrors((v) => !v)}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700"
                  >
                    {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showErrors ? "Masquer" : "Voir"} les lignes en erreur
                  </button>
                  {showErrors && (
                    <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-red-100 bg-red-50 p-3">
                      {rows.filter((r) => r._status === "error").map((row, i) => (
                        <div key={i} className="text-[12px] text-red-700">
                          <span className="font-semibold">Ligne {row._rowIndex}</span> · {String(row.marque || "?")} — {row._error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Pied de modal ── */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {step === "upload" && (
            <button
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={startImport}
                disabled={pendingValid === 0}
                className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Importer {pendingValid} support{pendingValid > 1 ? "s" : ""}
              </button>
            </>
          )}

          {step === "done" && (
            <>
              {errorCount > 0 && (
                <button
                  onClick={reset}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Réimporter les erreurs
                </button>
              )}
              <button
                onClick={() => { onImported(); reset(); }}
                className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0B3C53]/90"
              >
                <CheckCircle2 className="h-4 w-4" />
                Voir les supports
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}