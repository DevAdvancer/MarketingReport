import { ROLE_CREATE_SCOPE, ROLE_LABELS } from "@/lib/mock-data";
import { Role, User } from "@/lib/types";

export function getRoleLabel(role: Role) {
  return ROLE_LABELS[role];
}

export function getCreatableRoles(role: Role) {
  return ROLE_CREATE_SCOPE[role];
}

export function getUserById(users: User[], id: string | null | undefined) {
  if (!id) return null;
  return users.find((user) => user.id === id) ?? null;
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

export function getManagedUsers(currentUser: User, users: User[]) {
  return users.filter((user) => user.id !== currentUser.id && canManageUser(currentUser, user));
}

export function buildHierarchyLabel(user: User, users: User[]) {
  const manager = getUserById(users, user.managerId);
  const assistant = getUserById(users, user.assistantManagerId);
  const lead = getUserById(users, user.teamLeadId);

  return [
    manager ? `Manager: ${manager.name}` : null,
    assistant ? `Assistant Manager: ${assistant.name}` : null,
    lead ? `Team Lead: ${lead.name}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function generateEmployeeId(name: string, role: Role, users: User[]) {
  const cleaned = name.replace(/[^a-zA-Z ]/g, "").trim();
  const initials = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const prefix =
    role === "admin"
      ? "ADM"
      : role === "manager"
        ? "MGR"
        : role === "assistant_manager"
          ? "AST"
          : role === "team_lead"
            ? "TL"
            : "EMP";
  const nextNumber = users.filter((user) => user.role === role).length + 1;
  return `VIZ-${prefix}-${initials || "NA"}-${String(nextNumber).padStart(3, "0")}`;
}

export function deriveReportingChain(
  creator: User,
  role: Role,
  selectedManagerId: string | null,
  selectedAssistantManagerId: string | null,
  selectedTeamLeadId: string | null,
) {
  if (creator.role === "admin") {
    return {
      managerId: role === "manager" ? null : selectedManagerId,
      assistantManagerId:
        role === "assistant_manager" || role === "manager" ? null : selectedAssistantManagerId,
      teamLeadId: role === "emp" ? selectedTeamLeadId : null,
    };
  }

  if (creator.role === "manager") {
    return {
      managerId: creator.id,
      assistantManagerId: role === "assistant_manager" ? null : selectedAssistantManagerId,
      teamLeadId: role === "emp" ? selectedTeamLeadId : null,
    };
  }

  if (creator.role === "assistant_manager") {
    return {
      managerId: creator.managerId,
      assistantManagerId: creator.id,
      teamLeadId: role === "emp" ? selectedTeamLeadId : null,
    };
  }

  if (creator.role === "team_lead") {
    return {
      managerId: creator.managerId,
      assistantManagerId: creator.assistantManagerId,
      teamLeadId: creator.id,
    };
  }

  return {
    managerId: null,
    assistantManagerId: null,
    teamLeadId: null,
  };
}
