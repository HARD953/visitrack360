"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, AlertCircle, Loader2,
  Mail, Lock, ArrowRight, ShieldCheck, KeyRound, Fingerprint,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard-executif");
    }
  }, [user, isLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; detail?: { detail?: string } };
      if (apiErr?.status === 401) {
        setError("Email ou mot de passe incorrect.");
      } else {
        setError("Impossible de contacter le serveur. Réessayez dans quelques instants.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA]">
        <Loader2 className="h-7 w-7 animate-spin text-[#0B3C53]" strokeWidth={2} />
      </div>
    );
  }

  const fieldBase =
    "w-full rounded-lg border bg-white px-3.5 py-3 pl-10 text-[14.5px] text-[#0B2A3B] outline-none transition-all duration-150 placeholder:text-slate-300";
  const fieldFocused = "border-[#0B3C53] ring-4 ring-[#0B3C53]/[0.07]";
  const fieldNormal = "border-slate-200 hover:border-slate-300";

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Panneau gauche : identité de marque ── */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between bg-[#0A2F42] p-12 relative overflow-hidden">

        {/* Grille technique en fond, évoque le maillage cartographique des supports */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.05]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Halo de couleur */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#4FC3F7] opacity-[0.08] blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-[#26C6DA] opacity-[0.06] blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.08] border border-white/[0.14]">
            <span className="text-[17px] font-semibold text-white">V</span>
          </div>
          <div>
            <p className="text-[14.5px] font-semibold text-white tracking-tight leading-none">
              VisiTrack360
            </p>
            <p className="text-[11px] text-white/40 mt-1 tracking-wide">Audit de Visibilité</p>
          </div>
        </div>

        {/* Corps */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.12] rounded-full px-3 py-1.5 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4FC3F7]" />
            <span className="text-[11px] text-white/70 font-medium tracking-wide">
              Plateforme active · v2.5
            </span>
          </div>

          <h1 className="text-[34px] font-semibold leading-[1.22] text-white tracking-tight mb-4 max-w-[360px]">
            Pilotage fiscal et opérationnel des supports de visibilité.
          </h1>
          <p className="text-[14px] leading-relaxed text-white/45 max-w-[300px]">
            Inventoriez, calculez, comparez, négociez et décidez depuis une
            seule plateforme unifiée.
          </p>
        </div>

        {/* Statistiques */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            { label: "Supports recensés", value: "1 375+" },
            { label: "Communes couvertes", value: "18" },
            { label: "Économies générées", value: "52M FCFA" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4"
            >
              <p className="text-[19px] font-semibold text-white tracking-tight tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1 text-[10.5px] text-white/40 leading-snug">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panneau droit : formulaire ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[380px]">

          {/* Logo mobile */}
          <div className="mb-9 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B3C53]">
              <span className="text-[15px] font-semibold text-white">V</span>
            </div>
            <div>
              <p className="text-[14.5px] font-semibold text-slate-900 leading-none">VisiTrack360</p>
              <p className="text-[11px] text-slate-400 mt-1">Audit de Visibilité</p>
            </div>
          </div>

          {/* En-tête */}
          <div className="mb-8">
            <h2 className="text-[23px] font-semibold text-[#0B2A3B] tracking-tight">
              Bon retour
            </h2>
            <p className="mt-1.5 text-[14px] text-slate-400">
              Connectez-vous à votre espace de travail.
            </p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
              <p className="text-[13px] font-medium text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[12px] font-medium text-slate-500"
              >
                Adresse email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300"
                  strokeWidth={2}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  placeholder="vous@entreprise.com"
                  className={`${fieldBase} ${focused === "email" ? fieldFocused : fieldNormal}`}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[12px] font-medium text-slate-500"
                >
                  Mot de passe
                </label>
                <a
                  href="/mot-de-passe-oublie"
                  className="text-[12px] font-medium text-[#0B3C53]/60 hover:text-[#0B3C53] transition-colors"
                >
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300"
                  strokeWidth={2}
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  className={`${fieldBase} pr-10 ${focused === "password" ? fieldFocused : fieldNormal}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B3C53] px-4 py-3 text-[14.5px] font-medium text-white transition-all hover:bg-[#0a3348] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 shadow-sm shadow-[#0B3C53]/15"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  Connexion en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Séparateur */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[11px] text-slate-300 font-medium uppercase tracking-wider">
              ou
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* SSO */}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[13.5px] font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76l4-3.11Z" />
              <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.11c.95-2.85 3.6-4.96 6.73-4.96Z" />
            </svg>
            Connexion via Microsoft / Google
          </button>

          {/* Bande de confiance */}
          <div className="flex items-center justify-center gap-5 mt-7 pt-6 border-t border-slate-100">
            {[
              { icon: ShieldCheck, label: "Connexion sécurisée" },
              { icon: KeyRound, label: "Données chiffrées" },
              { icon: Fingerprint, label: "Accès contrôlé" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-slate-300" strokeWidth={2} />
                <span className="text-[10.5px] text-slate-400 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <p className="mt-7 text-center text-[11px] text-slate-300">
            VisiTrack360 © 2025 — LanfiaTech / LMC
          </p>
        </div>
      </div>
    </div>
  );
}