// Central API client for the Karigar backend.
// Reads the base URL from VITE_API_URL and attaches the JWT (if present)
// to every request. Throws ApiError on non-2xx / unsuccessful responses.

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

const TOKEN_KEY = "karigar_token";
const REFRESH_KEY = "karigar_refresh";

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  setRefresh: (token: string) => localStorage.setItem(REFRESH_KEY, token),
  // clear() removes BOTH tokens (full logout).
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const REFRESH_PATH = "/auth/refresh";
// De-dupe concurrent refreshes: if several requests 401 at once, they share one
// refresh round-trip instead of each firing their own.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const rt = tokenStore.getRefresh();
  if (!rt) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<boolean> => {
      try {
        const res = await fetch(`${API_URL}${REFRESH_PATH}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success || !json?.data?.token) return false;
        tokenStore.set(json.data.token);
        if (json.data.refreshToken) tokenStore.setRefresh(json.data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })();
    refreshInFlight.finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // attach token (default: true)
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

async function request<T>(path: string, options: RequestOptions = {}, retried = false): Promise<ApiEnvelope<T>> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Network error. Please check your connection and try again.", 0);
  }

  // Access token expired → silently refresh once and retry the original request.
  if (res.status === 401 && auth && !retried && path !== REFRESH_PATH) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options, true);
    tokenStore.clear(); // refresh failed → truly logged out
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    json = null;
  }

  if (!res.ok || !json?.success) {
    const message = json?.message || `Request failed (${res.status})`;
    if (res.status === 401) tokenStore.clear();
    throw new ApiError(message, res.status);
  }

  return json;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: "PUT", body, auth }),
  del: <T>(path: string, auth = true) => request<T>(path, { method: "DELETE", auth }),
};

export { API_URL };
