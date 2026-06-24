import { apiFetch, setTokens, clearTokens } from "./client";

export interface UserData {
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
  affectations: Array<{
    id: number;
    typeZone: string;
    valeurZone: string;
    estActive: boolean;
  }>;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: UserData;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setTokens(data.access, data.refresh);
  localStorage.setItem("visitrack_user", JSON.stringify(data.user));
  return data;
}

export async function logout(): Promise<void> {
  clearTokens();
}

export async function getMe(): Promise<UserData> {
  return apiFetch<UserData>("/api/auth/me/");
}

export function getUserFromStorage(): UserData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("visitrack_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}