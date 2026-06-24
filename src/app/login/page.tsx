"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, AlertCircle, Loader2,
  Mail, Lock, LogIn, ShieldCheck, EyeOff as EyeOffIcon, KeyRound,
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
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0B3C53]" />
      </div>
    );
  }

  const fieldBase =
    "w-full rounded-xl border bg-[#FAFBFC] px-3.5 py-2.5 pl-10 text-[14px] text-[#0B3C53] outline-none transition-all placeholder:text-slate-300 focus:bg-white";
  const fieldFocused = "border-[#0B3C53] ring-[3px] ring-[#0B3C53]/8";
  const fieldNormal = "border-slate-200 hover:border-slate-300";

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">

      {/* ── Panneau gauche ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#0B3C53] p-12 relative overflow-hidden">

        {/* Orbes décoratifs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#4FC3F7] opacity-[0.07]" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-[#26C6DA] opacity-[0.07]" />
        <div className="absolute bottom-48 right-6 w-32 h-32 rounded-full bg-[#80DEEA] opacity-[0.06]" />

        {/* Anneaux pulsants */}
        <div className="absolute bottom-20 right-10 w-44 h-44 rounded-full border border-[#4FC3F7]/15 animate-pulse" />
        <div className="absolute bottom-14 right-4 w-56 h-56 rounded-full border border-[#4FC3F7]/8 animate-pulse [animation-delay:0.8s]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
            <span className="text-lg font-bold text-white">V</span>
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight">VisiTrack360</p>
            <p className="text-[11px] text-white/40 mt-0.5">Audit de Visibilité</p>
          </div>
        </div>

        {/* Corps */}
        <div className="relative z-10">
          {/* Badge animé */}
          <div className="inline-flex items-center gap-2 bg-[#4FC3F7]/12 border border-[#4FC3F7]/25 rounded-full px-3 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4FC3F7] animate-pulse" />
            <span className="text-[11px] text-[#4FC3F7] font-medium tracking-wide">
              Plateforme active · v2.5
            </span>
          </div>

          <h1 className="text-[32px] font-bold leading-[1.2] text-white tracking-tight mb-4">
            Pilotage fiscal
            <br />
            et opérationnel
            <br />
            <span className="text-white/35">des supports</span>
            <br />
            de visibilité.
          </h1>
          <p className="text-[13.5px] leading-relaxed text-white/50 max-w-[280px]">
            Inventoriez, calculez, comparez, négociez et décidez
            depuis une seule plateforme unifiée.
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            { label: "Supports recensés", value: "1 375+" },
            { label: "Communes couvertes", value: "18" },
            { label: "Économies générées", value: "52M FCFA" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-white/5 border border-white/8 p-4 hover:bg-white/9 transition-colors"
            >
              <p className="text-[18px] font-bold text-white tracking-tight">{stat.value}</p>
              <p className="mt-1 text-[10px] text-white/40 leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[360px]">

          {/* Logo mobile */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B3C53]">
              <span className="text-base font-bold text-white">V</span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-slate-900">VisiTrack360</p>
              <p className="text-[11px] text-slate-400">Audit de Visibilité</p>
            </div>
          </div>

          {/* En-tête formulaire */}
          <div className="mb-8">
            <h2 className="text-[22px] font-bold text-[#0B3C53] tracking-tight">
              Bon retour 👋
            </h2>
            <p className="mt-1.5 text-[13.5px] text-slate-400">
              Connectez-vous à votre espace de travail.
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-[13px] font-medium text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
              >
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                <input
                  id="email"
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
              <label
                htmlFor="password"
                className="mb-1.5 block text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
              >
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                <input
                  id="password"
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
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Mot de passe oublié */}
              <div className="flex justify-end mt-2">
                <a>
                  href="#"
                  className="text-[12px] text-[#0B3C53]/60 hover:text-[#0B3C53] font-medium transition-colors"
                
                  Mot de passe oublie ?
                </a>
              </div>
            </div>

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B3C53] px-4 py-3 text-[14px] font-semibold text-white transition-all hover:bg-[#0a3348] active:scale-[0.99] disabled:opacity-60 shadow-sm shadow-[#0B3C53]/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Séparateur SSO */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[11px] text-slate-300 font-medium">ou continuer avec</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Bouton SSO */}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
              G
            </div>
            Connexion SSO / Microsoft
          </button>

          {/* Bande de confiance */}
          <div className="flex items-center justify-center gap-5 mt-6 pt-5 border-t border-slate-100">
            {[
              { icon: ShieldCheck, label: "Connexion sécurisée" },
              { icon: KeyRound, label: "Données chiffrées" },
              { icon: EyeOffIcon, label: "Privé" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-[#0B3C53]/40" />
                <span className="text-[10.5px] text-slate-400 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-300">
            VisiTrack360 © 2025 — LanfiaTech / LMC
          </p>
        </div>
      </div>
    </div>
  );
}