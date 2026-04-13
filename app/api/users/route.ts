import { NextResponse } from "next/server";
import { DbUser, Role, User } from "@/lib/types";
import { findUserByEmail } from "@/lib/data-store";
import { getErrorMessage } from "@/lib/api-errors";
import { getCurrentUserFromCookie, hashPassword } from "@/lib/auth-server";
import { createSafeUser, ensureSeededUsers, getSafeUsers } from "@/lib/user-service";
import { deriveReportingChain, generateEmployeeId, getCreatableRoles } from "@/lib/rbac";

function needsManager(role: Role) {
  return role === "assistant_manager" || role === "team_lead" || role === "emp";
}

function needsAssistantManager(role: Role) {
  return role === "team_lead" || role === "emp";
}

export async function GET() {
  try {
    await ensureSeededUsers();
    const currentUser = await getCurrentUserFromCookie();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getSafeUsers();
    return NextResponse.json({ currentUser, users });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to load users.") },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeededUsers();
    const currentUser = await getCurrentUserFromCookie();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      employeeId?: string;
      role?: Role;
      branch?: string;
      department?: string;
      designation?: string;
      managerId?: string;
      assistantManagerId?: string;
      teamLeadId?: string;
    };

    const allowedRoles = getCreatableRoles(currentUser.role);
    if (!body.role || !allowedRoles.includes(body.role)) {
      return NextResponse.json({ error: "You cannot create this role." }, { status: 403 });
    }

    if (currentUser.role === "admin" && needsManager(body.role) && !body.managerId) {
      return NextResponse.json({ error: "Manager selection is required for this role." }, { status: 400 });
    }

    if (
      currentUser.role === "admin" &&
      needsAssistantManager(body.role) &&
      !body.assistantManagerId
    ) {
      return NextResponse.json(
        { error: "Assistant Manager selection is required for this role." },
        { status: 400 },
      );
    }

    if (
      currentUser.role === "manager" &&
      needsAssistantManager(body.role) &&
      !body.assistantManagerId
    ) {
      return NextResponse.json(
        { error: "Assistant Manager selection is required for this role." },
        { status: 400 },
      );
    }

    const users = await getSafeUsers();
    const existingUser = body.email ? await findUserByEmail(body.email) : null;
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    }
    const employeeId = body.employeeId?.trim() || generateEmployeeId(body.name || "User", body.role, users);
    const reporting = deriveReportingChain(
      currentUser,
      body.role,
      body.managerId || null,
      body.assistantManagerId || null,
      body.teamLeadId || null,
    );

    const nextUser: DbUser = {
      id: `u-${Date.now()}`,
      employeeId,
      name: body.name || "",
      email: body.email || "",
      role: body.role,
      designation: body.designation || body.role,
      department: body.department || "Marketing",
      branch: body.branch || "AMD",
      managerId: reporting.managerId,
      assistantManagerId: reporting.assistantManagerId,
      teamLeadId: reporting.teamLeadId,
      createdById: currentUser.id,
      passwordHash: hashPassword(body.password || "password123"),
    };

    const safeUser = await createSafeUser(nextUser);
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to create user.") },
      { status: 500 },
    );
  }
}
