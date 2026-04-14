import { NextResponse } from "next/server";
import {
  findReportById,
  findUserById,
  listReportSummaries,
  listReportSummariesForEmployees,
  listUsersManagedBy,
  upsertReport,
} from "@/lib/data-store";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { canManageUser } from "@/lib/user-service";
import { ReportRecord, ReportSnapshot, ReportType } from "@/lib/types";

function getSnapshotValue(snapshot: ReportSnapshot, ...keys: string[]) {
  for (const key of keys) {
    const value = snapshot[key];
    if (value) return value;
  }
  return "";
}

function canAccessReport(currentUserId: string, employeeUserId: string, currentUserRole: string, managed: boolean) {
  return currentUserRole === "admin" || currentUserId === employeeUserId || managed;
}

export async function GET() {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role === "admin") {
    const reports = await listReportSummaries();
    return NextResponse.json({ reports });
  }

  const managedUsers = await listUsersManagedBy(currentUser.id);
  const employeeIds = managedUsers.map((u) => u.id);
  if (!employeeIds.includes(currentUser.id)) {
    employeeIds.push(currentUser.id);
  }

  const reports = await listReportSummariesForEmployees(employeeIds);
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    reportType?: ReportType;
    employeeId?: string;
    snapshot?: ReportSnapshot;
  };

  if (!body.reportType || !body.employeeId || !body.snapshot) {
    return NextResponse.json({ error: "Report type, employee, and report data are required." }, { status: 400 });
  }

  const employee = await findUserById(body.employeeId);
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  if (
    currentUser.role !== "admin" &&
    currentUser.id !== employee.id &&
    !canManageUser(currentUser, employee)
  ) {
    return NextResponse.json({ error: "You do not have access to this employee." }, { status: 403 });
  }

  const existing = body.id ? await findReportById(body.id) : null;
  const createdAt = existing?.createdAt ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const report: ReportRecord = {
    id: existing?.id ?? `report-${Date.now()}`,
    reportType: body.reportType,
    employeeId: employee.id,
    employeeName: getSnapshotValue(body.snapshot, "empName") || employee.name,
    employeeCode: getSnapshotValue(body.snapshot, "empID") || employee.employeeId,
    designation: getSnapshotValue(body.snapshot, "designationInput") || employee.designation,
    branch: getSnapshotValue(body.snapshot, "branchInput") || employee.branch,
    reviewMonth: getSnapshotValue(body.snapshot, "monthInput"),
    overallScore: getSnapshotValue(body.snapshot, "avgScore"),
    ratingLabel: getSnapshotValue(body.snapshot, "ratingText"),
    createdById: existing?.createdById ?? currentUser.id,
    createdByName: existing?.createdByName ?? currentUser.name,
    createdAt,
    updatedAt,
    snapshot: body.snapshot,
  };

  await upsertReport(report);
  return NextResponse.json({ report });
}
