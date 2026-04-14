export type Role = "admin" | "manager" | "assistant_manager" | "team_lead" | "emp";

export type ReportType = "bsr" | "application-recruiter";

export type User = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: Role;
  designation: string;
  department: string;
  branch: string;
  managerId: string | null;
  assistantManagerId: string | null;
  teamLeadId: string | null;
  createdById: string | null;
};

export type Session = {
  userId: string;
};

export type DbUser = User & {
  passwordHash: string;
};

export type ReportSnapshot = Record<string, string>;

export type ReportRecord = {
  id: string;
  reportType: ReportType;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  branch: string;
  reviewMonth: string;
  overallScore: string;
  ratingLabel: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  snapshot: ReportSnapshot;
};

export type ReportListItem = Omit<ReportRecord, "snapshot">;
