import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUserFromCookie } from "@/lib/auth-server";
import { getErrorMessage } from "@/lib/api-errors";
import { ensureSeededUsers, setupCompleted } from "@/lib/user-service";

export async function GET() {
  try {
    await ensureSeededUsers();
    const user = await getCurrentUserFromCookie();

    if (!user) {
      return NextResponse.json({ user: null, setupRequired: !(await setupCompleted()) }, { status: 401 });
    }

    return NextResponse.json({ user, setupRequired: false });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to check session."), user: null, setupRequired: false },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to logout.") },
      { status: 500 },
    );
  }
}
