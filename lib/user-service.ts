import { DbUser, Role, User } from "@/lib/types";
import { createInitialAdmin, createUserRecord, hasUsers, listUsers } from "@/lib/data-store";
import { hashPassword } from "@/lib/auth-server";
import { ROLE_LABELS } from "@/lib/mock-data";

const globalForUserService = globalThis as typeof globalThis & {
  _vizvaSetupKnown?: boolean;
  _vizvaEnsureSeededPromise?: Promise<void> | null;
};

export async function ensureSeededUsers() {
  if (globalForUserService._vizvaSetupKnown) {
    return;
  }

  if (!globalForUserService._vizvaEnsureSeededPromise) {
    globalForUserService._vizvaEnsureSeededPromise = (async () => {
      if (await hasUsers()) {
        globalForUserService._vizvaSetupKnown = true;
        return;
      }

      await createInitialAdmin({
        id: "u-admin-1",
        employeeId: "VIZ-ADM-001",
        name: "Admin",
        email: "admin@vizvainc.com",
        role: "admin",
        designation: "Admin",
        department: "Marketing",
        branch: "AMD",
        managerId: null,
        assistantManagerId: null,
        teamLeadId: null,
        createdById: null,
        passwordHash: hashPassword("admin"),
      });
      globalForUserService._vizvaSetupKnown = true;
    })();
  }

  try {
    await globalForUserService._vizvaEnsureSeededPromise;
  } finally {
    globalForUserService._vizvaEnsureSeededPromise = null;
  }
}

export async function getSafeUsers() {
  const users = await listUsers();
  return users.map(({ passwordHash: _passwordHash, ...user }) => user);
}

export async function createSafeUser(user: DbUser) {
  const createdUser = await createUserRecord(user);
  globalForUserService._vizvaSetupKnown = true;
  const { passwordHash: _passwordHash, ...safeUser } = createdUser;
  return safeUser;
}

export async function createInitialAdminUser(user: Omit<DbUser, "passwordHash"> & { password: string }) {
  const nextUser: DbUser = {
    ...user,
    passwordHash: hashPassword(user.password),
  };

  const createdUser = await createInitialAdmin(nextUser);
  globalForUserService._vizvaSetupKnown = true;
  const { passwordHash: _passwordHash, ...safeUser } = createdUser;
  return safeUser;
}

export async function setupCompleted() {
  if (globalForUserService._vizvaSetupKnown) {
    return true;
  }

  const completed = await hasUsers();
  if (completed) {
    globalForUserService._vizvaSetupKnown = true;
  }
  return completed;
}

export function getRoleLabel(role: Role) {
  return ROLE_LABELS[role];
}

export function canManageUser(currentUser: User, targetUser: User) {
  if (currentUser.id === targetUser.id) return true;
  if (currentUser.role === "admin") return true;

  return [
    targetUser.managerId,
    targetUser.assistantManagerId,
    targetUser.teamLeadId,
    targetUser.createdById,
  ].includes(currentUser.id);
}
