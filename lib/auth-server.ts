import { cookies } from "next/headers";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { findUserById } from "@/lib/data-store";
import { User } from "@/lib/types";

const COOKIE_NAME = "vizva_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "vizva-dev-secret";
const USER_CACHE_TTL_MS = 1000 * 60 * 5;

type CachedUser = {
  user: User;
  expiresAt: number;
};

const globalForAuth = globalThis as typeof globalThis & {
  _vizvaSessionUserCache?: Map<string, CachedUser>;
};

const sessionUserCache = globalForAuth._vizvaSessionUserCache ?? new Map<string, CachedUser>();
globalForAuth._vizvaSessionUserCache = sessionUserCache;

export function hashPassword(password: string) {
  return password;
}

export function verifyPassword(password: string, storedHash: string) {
  if (!storedHash.includes(":")) {
    return password === storedHash;
  }

  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;
  const hash = scryptSync(password, salt, 64);
  const original = Buffer.from(originalHash, "hex");
  if (hash.length !== original.length) return false;
  return timingSafeEqual(hash, original);
}

function signUserId(userId: string) {
  return createHmac("sha256", SESSION_SECRET).update(userId).digest("hex");
}

export function buildSessionValue(userId: string) {
  return `${userId}.${signUserId(userId)}`;
}

export function parseSessionValue(value: string | undefined) {
  if (!value) return null;
  const [userId, signature] = value.split(".");
  if (!userId || !signature) return null;
  const expected = signUserId(userId);
  if (signature !== expected) return null;
  return userId;
}

export async function getCurrentUserFromCookie() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  const userId = parseSessionValue(session);
  if (!userId) return null;

  const cached = sessionUserCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  if (cached) {
    sessionUserCache.delete(userId);
  }

  const user = await findUserById(userId);
  if (!user) {
    sessionUserCache.delete(userId);
    return null;
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  sessionUserCache.set(userId, {
    user: safeUser,
    expiresAt: Date.now() + USER_CACHE_TTL_MS,
  });
  return safeUser;
}

export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, buildSessionValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  const userId = parseSessionValue(session);
  if (userId) {
    sessionUserCache.delete(userId);
  }
  cookieStore.delete(COOKIE_NAME);
}
