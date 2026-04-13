import { NextRequest, NextResponse } from "next/server";
import { findReportById, findUserById } from "@/lib/data-store";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { canManageUser } from "@/lib/user-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;
  const report = await findReportById(reportId);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const employee = await findUserById(report.employeeId);
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  if (
    currentUser.role !== "admin" &&
    currentUser.id !== employee.id &&
    !canManageUser(currentUser, employee)
  ) {
    return NextResponse.json({ error: "You do not have access to this report." }, { status: 403 });
  }

  return NextResponse.json({ report });
}
