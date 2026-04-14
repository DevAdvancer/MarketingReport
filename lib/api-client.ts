"use client";

import { ReportListItem, ReportRecord, ReportSnapshot, ReportType, User } from "@/lib/types";

// ---------------------------------------------------------------------------
// Generic in-memory cache with request de-duplication
// ---------------------------------------------------------------------------
type CacheEntry<T> = { value: T; expiresAt: number };
const _cache = new Map<string, CacheEntry<unknown>>();
const _inflight = new Map<string, Promise<unknown>>();
const DATA_CACHE_TTL_MS = 1000 * 30; // 30 seconds

async function cachedFetch<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
  // Return still-valid cached value immediately
  const hit = _cache.get(cacheKey) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  // De-duplicate: if a request is already in-flight, wait for it
  if (_inflight.has(cacheKey)) return _inflight.get(cacheKey) as Promise<T>;

  const promise = fn().then((value) => {
    _cache.set(cacheKey, { value, expiresAt: Date.now() + DATA_CACHE_TTL_MS });
    _inflight.delete(cacheKey);
    return value;
  }).catch((err) => {
    _inflight.delete(cacheKey);
    throw err;
  });

  _inflight.set(cacheKey, promise);
  return promise;
}

/** Invalidate a cache key (call after mutations) */
export function invalidateCache(cacheKey: string) {
  _cache.delete(cacheKey);
}

type SessionPayload = {
  user: User | null;
  setupRequired?: boolean;
};

type CachedSession = {
  user: User;
  expiresAt: number;
};

const SESSION_CACHE_KEY = "vizva-session-cache";
const SESSION_CACHE_TTL_MS = 1000 * 60 * 5;

function readCachedSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedSession;
    if (!cached.user || cached.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return cached.user;
  } catch {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
    return null;
  }
}

function writeCachedSession(user: User | null | undefined) {
  if (typeof window === "undefined") return;

  if (!user) {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
    return;
  }

  const cached: CachedSession = {
    user,
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  };
  window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cached));
}

async function readResponseJson<T>(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(
      text.startsWith("<!DOCTYPE") || text.startsWith("<html")
        ? "The server returned an HTML error page instead of JSON."
        : `Unexpected server response (${response.status}).`,
    );
  }

  return (await response.json()) as T;
}

export async function fetchSession() {
  const cachedUser = readCachedSession();
  if (cachedUser) {
    return cachedUser;
  }

  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await readResponseJson<SessionPayload>(response);
    writeCachedSession(data.user);
    return data.user;
  } catch {
    writeCachedSession(null);
    return null;
  }
}

export async function fetchSessionState() {
  const cachedUser = readCachedSession();
  if (cachedUser) {
    return { user: cachedUser, setupRequired: false };
  }

  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (response.status === 401) {
      const data = await readResponseJson<SessionPayload>(response);
      writeCachedSession(null);
      return { user: null, setupRequired: Boolean(data.setupRequired) };
    }

    if (!response.ok) {
      writeCachedSession(null);
      return { user: null, setupRequired: false };
    }

    const data = await readResponseJson<SessionPayload>(response);
    writeCachedSession(data.user);
    return { user: data.user, setupRequired: false };
  } catch {
    writeCachedSession(null);
    return { user: null, setupRequired: false };
  }
}

export async function logout() {
  await fetch("/api/session", { method: "DELETE" });
  writeCachedSession(null);
}

export async function login(email: string, password: string) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await readResponseJson<{ error?: string; ok?: true; role?: string }>(response);
  if (!response.ok) {
    throw new Error(data.error || "Login failed.");
  }
  return data as { ok: true; role: string };
}

export async function fetchUsers() {
  return cachedFetch("users", async () => {
    const response = await fetch("/api/users", { cache: "no-store" });
    const data = await readResponseJson<{ error?: string; currentUser?: User; users?: User[] }>(response);
    if (!response.ok) {
      throw new Error(data.error || "Unable to load users.");
    }
    writeCachedSession(data.currentUser);
    return data as { currentUser: User; users: User[] };
  });
}

export async function createUser(payload: Record<string, string>) {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readResponseJson<{ error?: string; user?: User }>(response);
  if (!response.ok) {
    throw new Error(data.error || "Unable to create user.");
  }
  return data as { user: User };
}

export async function createAdmin(payload: { name: string; email: string; password: string }) {
  const response = await fetch("/api/setup-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readResponseJson<{ error?: string; user?: User }>(response);
  if (!response.ok) {
    throw new Error(data.error || "Unable to create admin.");
  }
  writeCachedSession(data.user);
  return data as { user: User };
}

export async function fetchReports() {
  return cachedFetch("reports", async () => {
    const response = await fetch("/api/reports", { cache: "no-store" });
    const data = await readResponseJson<{ error?: string; reports?: ReportListItem[] }>(response);
    if (!response.ok) {
      throw new Error(data.error || "Unable to load reports.");
    }
    return data as { reports: ReportListItem[] };
  });
}

export async function fetchReport(reportId: string) {
  const response = await fetch(`/api/reports/${reportId}`, { cache: "no-store" });
  const data = await readResponseJson<{ error?: string; report?: ReportRecord }>(response);
  if (!response.ok) {
    throw new Error(data.error || "Unable to load report.");
  }
  return data as { report: ReportRecord };
}

export async function saveReport(payload: {
  id?: string;
  reportType: ReportType;
  employeeId: string;
  snapshot: ReportSnapshot;
}) {
  // Invalidate so the history list re-fetches fresh data after a save
  invalidateCache("reports");
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readResponseJson<{ error?: string; report?: ReportRecord }>(response);
  if (!response.ok) {
    throw new Error(data.error || "Unable to save report.");
  }
  return data as { report: ReportRecord };
}
