import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/data-store";
import { getErrorMessage } from "@/lib/api-errors";
import { ensureSeededUsers } from "@/lib/user-service";
import { setSessionCookie, verifyPassword } from "@/lib/auth-server";

export async function POST(request: Request) {
  try {
    await ensureSeededUsers();

    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await findUserByEmail(email);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await setSessionCookie(user.id);
    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to login.") },
      { status: 500 },
    );
  }
}
