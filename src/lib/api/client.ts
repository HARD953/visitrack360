// Client HTTP centralisé pour tous les appels vers le backend DRF.
// - Injecte automatiquement le token JWT depuis localStorage
// - Gère le refresh automatique (401 → refresh → retry)
// - Lance une redirection vers /login si le refresh échoue

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://backend360.onrender.com";

// ---------------------------------------------------------------------------
// Types de base
// ---------------------------------------------------------------------------

export interface ApiError {
  status: number;
  message: string;
  detail?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers token
// ---------------------------------------------------------------------------

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("visitrack_access");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("visitrack_refresh");
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem("visitrack_access", access);
  localStorage.setItem("visitrack_refresh", refresh);
}

export function clearTokens(): void {
  localStorage.removeItem("visitrack_access");
  localStorage.removeItem("visitrack_refresh");
  localStorage.removeItem("visitrack_user");
}

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token");

  const res = await fetch(`${BASE_URL}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearTokens();
    window.location.href = "/login";
    throw new Error("Refresh failed");
  }

  const data = await res.json();
  localStorage.setItem("visitrack_access", data.access);
  return data.access;
}

// ---------------------------------------------------------------------------
// Fetch centralisé
// ---------------------------------------------------------------------------

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Multipart : on retire Content-Type pour laisser le browser le poser avec boundary
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const doFetch = (accessToken?: string) =>
    fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: accessToken
        ? { ...headers, Authorization: `Bearer ${accessToken}` }
        : headers,
    });

  let res = await doFetch();

  // 401 → tenter un refresh une seule fois
  if (res.status === 401) {
    if (isRefreshing) {
      // D'autres requêtes attendent le refresh en cours
      const newToken = await new Promise<string>((resolve) =>
        refreshQueue.push(resolve)
      );
      res = await doFetch(newToken);
    } else {
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        res = await doFetch(newToken);
      } finally {
        isRefreshing = false;
      }
    }
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = res.statusText;
    }
    const error: ApiError = { status: res.status, message: res.statusText, detail };
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}