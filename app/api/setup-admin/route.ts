import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/data-store";
import { getErrorMessage } from "@/lib/api-errors";
import { setSessionCookie } from "@/lib/auth-server";
import { createInitialAdminUser, setupCompleted } from "@/lib/user-service";

export async function GET() {
  try {
    return NextResponse.json({ setupRequired: !(await setupCompleted()) });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to check setup."), setupRequired: false },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (await setupCompleted()) {
      return NextResponse.json({ error: "Admin setup is already complete." }, { status: 409 });
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    const existing = await findUserByEmail(body.email);
    if (existing) {
      return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    }

    const user = await createInitialAdminUser({
      id: `u-admin-${Date.now()}`,
      employeeId: "VIZ-ADM-001",
      name: body.name,
      email: body.email,
      role: "admin",
      designation: "Admin",
      department: "Marketing",
      branch: "AMD",
      managerId: null,
      assistantManagerId: null,
      teamLeadId: null,
      createdById: null,
      password: body.password,
    });

    await setSessionCookie(user.id);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to create admin.") },
      { status: 500 },
    );
  }
}
