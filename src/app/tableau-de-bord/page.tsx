"use client";

import type { ElementType } from "react";
import Link from "next/link";
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
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { mockNegotiationsDashboard } from "@/lib/mock/negotiationsDashboard";
import type { ActionType, ReadyArgument } from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Helpers d'affichage (propres à cette vue)
// ---------------------------------------------------------------------------

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatPeriod(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${fmt(f)} - ${fmt(t)}`;
}

function actionIcon(type: ActionType) {
  switch (type) {
    case "reunion":
      return <CalendarClock className="h-4 w-4" />;
    case "argumentaire":
      return <Mail className="h-4 w-4" />;
    case "relance":
      return <Phone className="h-4 w-4" />;
  }
}

function actionIconClasses(type: ActionType): string {
  switch (type) {
    case "reunion":
      return "bg-cyan-50 text-cyan-600";
    case "argumentaire":
      return "bg-blue-50 text-blue-600";
    case "relance":
      return "bg-violet-50 text-violet-600";
  }
}

function tagClasses(color: "blue" | "orange"): string {
  return color === "blue" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";
}

function readyArgumentIcon(key: ReadyArgument["iconKey"]) {
  switch (key) {
    case "absent":
      return <ImageOff className="h-4 w-4" />;
    case "doublon":
      return <Copy className="h-4 w-4" />;
    case "periode":
      return <CloudRain className="h-4 w-4" />;
    case "surface":
      return <Ruler className="h-4 w-4" />;
  }
}

function readyArgumentIconClasses(key: ReadyArgument["iconKey"]): string {
  switch (key) {
    case "absent":
      return "bg-red-50 text-red-500";
    case "doublon":
      return "bg-amber-50 text-amber-500";
    case "periode":
      return "bg-pink-50 text-pink-500";
    case "surface":
      return "bg-violet-50 text-violet-500";
  }
}

// Une couleur de badge dédiée par KPI, même logique que le Dashboard Exécutif
const KPI_STYLES: Record<string, { icon: ElementType; badge: string }> = {
  "dossiers-ouverts": { icon: Folder, badge: "bg-violet-500" },
  "montant-initial": { icon: Coins, badge: "bg-cyan-500" },
  "montant-recalcule": { icon: Calculator, badge: "bg-blue-500" },
  "montant-negocie": { icon: HandCoins, badge: "bg-orange-500" },
  "economie-obtenue": { icon: PiggyBank, badge: "bg-emerald-500" },
  "taux-reduction": { icon: Percent, badge: "bg-pink-500" },
};

// ---------------------------------------------------------------------------
// Navigation (dupliquée volontairement dans chaque vue)
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

const ACTIVE_HREF = "/tableau-de-bord";

export default function TableauDeBordPage() {
  const data = mockNegotiationsDashboard;
  const maxMonthlySaving = Math.max(...data.monthlySavings.map((m) => m.amount));

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
            MTN
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-slate-800">MTN-CI</p>
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
            HT
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-800">HASSANA Tioté</p>
            <p className="truncate text-[11px] text-slate-400">SuperAdmin</p>
          </div>
          <LogOut className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
        </div>
      </aside>

      {/* ===================== MAIN ===================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---------- HEADER ---------- */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <button className="text-slate-500 lg:hidden" aria-label="Ouvrir le menu">
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">
              Dashboard Négociations &amp; Économies
            </h2>
            <p className="text-[12px] text-slate-400">Tableau de bord</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                3
              </span>
            </button>

            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B3C53] text-sm font-bold text-white">
                HT
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-[13px] font-semibold text-slate-800">HASSANA Tioté</p>
                <p className="text-[11px] text-slate-400">Direction Exécutive</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* ---------- PAGE CONTENT ---------- */}
        <main className="flex-1 px-6 py-6">
          {/* Titre + filtres */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="border-l-4 border-[#0B3C53] pl-3">
              <h1 className="text-2xl font-bold text-slate-900">
                Dashboard Négociations &amp; Économies
              </h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Suivi des dossiers fiscaux et économies obtenues
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50">
                <Calendar className="h-4 w-4 text-slate-400" />
                {formatPeriod(data.period.from, data.period.to)}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#0B3C53]/90">
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {data.kpis.map((kpi) => {
              const style = KPI_STYLES[kpi.id];
              const Icon = style?.icon ?? Folder;
              return (
                <div
                  key={kpi.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {kpi.label}
                    </p>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style?.badge ?? "bg-slate-400"}`}
                    >
                      <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {formatNumber(kpi.value)}
                    {kpi.unit && (
                      <span className="ml-1 text-sm font-medium text-slate-400">{kpi.unit}</span>
                    )}
                  </p>
                  <p
                    className={`mt-2 text-[12px] font-semibold ${
                      kpi.trend.direction === "up" ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {kpi.trend.direction === "up" ? "↗" : "↘"}{" "}
                    {kpi.id === "dossiers-ouverts"
                      ? `-${formatNumber(kpi.trend.value)}`
                      : `${kpi.trend.direction === "up" ? "+" : "-"}${formatNumber(kpi.trend.value)}${
                          kpi.id === "taux-reduction" ? " pts" : "%"
                        }`}{" "}
                    <span className="font-normal text-slate-400">{kpi.trend.comparedTo}</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Grille : Dossiers de négociation + Dossiers en cours / Argumentaires */}
          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Dossiers de négociation (tableau) */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-slate-800">Dossiers de négociation</h2>
                <Info className="h-3.5 w-3.5 text-slate-400" />
              </div>

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
                      <tr
                        key={file.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 font-semibold text-slate-800">{file.commune}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                          {formatNumber(file.montantInitial)} FCFA
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                          {formatNumber(file.montantRecalcule)} FCFA
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                          {formatNumber(file.montantNegocie)} FCFA
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-bold text-emerald-600">
                          {formatNumber(file.economie)} FCFA
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${actionIconClasses(
                                file.nextAction.type
                              )}`}
                            >
                              {actionIcon(file.nextAction.type)}
                            </span>
                            <span className="text-slate-600">{file.nextAction.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Plus d'options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Link
                href="/ordres-de-recettes"
                className="mt-4 inline-block text-[13px] font-semibold text-[#0B3C53] hover:underline"
              >
                Voir tous les dossiers →
              </Link>
            </div>

            {/* Colonne droite : Dossiers en cours + Argumentaires prêts */}
            <div className="flex flex-col gap-4 xl:col-span-1">
              {/* Dossiers en cours */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-[14px] font-bold text-slate-800">Dossiers en cours</h2>
                  <Info className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="space-y-4">
                  {data.ongoingFiles.map((file) => (
                    <div key={file.id} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-800">
                          {file.commune}
                        </p>
                        <p className="truncate text-[12px] text-slate-500">
                          {file.nextAppointment}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${tagClasses(
                          file.tag.color
                        )}`}
                      >
                        {file.tag.label}
                      </span>
                    </div>
                  ))}
                </div>
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
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${readyArgumentIconClasses(
                          arg.iconKey
                        )}`}
                      >
                        {readyArgumentIcon(arg.iconKey)}
                      </div>
                      <span className="flex-1 text-[13px] font-medium text-slate-700">
                        {arg.label}
                      </span>
                      <span className="text-[13px] font-bold text-[#0B3C53]">
                        {arg.count} dossiers
                      </span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-[13px] font-semibold text-[#0B3C53] hover:underline">
                  Voir tous les argumentaires →
                </button>
              </div>
            </div>
          </div>

          {/* Économies mensuelles + Performance */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-slate-800">
                  Économies mensuelles (FCFA)
                </h2>
                <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50">
                  FCFA
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={data.monthlySavings}
                  margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v / 1_000_000}M`}
                    domain={[0, Math.ceil(maxMonthlySaving / 10_000_000) * 10_000_000]}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    formatter={(value) => [`${formatNumber(value as number)} FCFA`, "Économie"]}
                  />
                  <Bar dataKey="amount" fill="#0B3C53" radius={[4, 4, 0, 0]} barSize={48} />
                </BarChart>
              </ResponsiveContainer>
              <Link
                href="/analyse-fiscale"
                className="mt-2 inline-block text-[13px] font-semibold text-[#0B3C53] hover:underline"
              >
                Voir l&apos;analyse complète →
              </Link>
            </div>

            {/* Performance */}
            <div className="flex flex-col justify-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-[#0B3C53] to-[#0E4F66] p-6 text-white shadow-sm">
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
                soit {formatNumber(data.performance.totalSavingsAmount)} FCFA d&apos;économies
                obtenues.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}