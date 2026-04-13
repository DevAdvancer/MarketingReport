import { DbUser, Role, User } from "@/lib/types";
import { createInitialAdmin, createUserRecord, hasUsers, listUsers } from "@/lib/data-store";
import { hashPassword } from "@/lib/auth-server";
import { ROLE_LABELS } from "@/lib/mock-data";

export async function ensureSeededUsers() {
  if (await hasUsers()) {
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
}

export async function getSafeUsers() {
  const users = await listUsers();
  return users.map(({ passwordHash: _passwordHash, ...user }) => user);
}

export async function createSafeUser(user: DbUser) {
  const createdUser = await createUserRecord(user);
  const { passwordHash: _passwordHash, ...safeUser } = createdUser;
  return safeUser;
}

export async function createInitialAdminUser(user: Omit<DbUser, "passwordHash"> & { password: string }) {
  const nextUser: DbUser = {
    ...user,
    passwordHash: hashPassword(user.password),
  };

  const createdUser = await createInitialAdmin(nextUser);
  const { passwordHash: _passwordHash, ...safeUser } = createdUser;
  return safeUser;
}

export async function setupCompleted() {
  return hasUsers();
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
