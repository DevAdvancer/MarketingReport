import { Role } from "@/lib/types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  assistant_manager: "Assistant Manager",
  team_lead: "Team Lead",
  emp: "EMP",
};

export const REPORT_LABELS = {
  bsr: "Bench Sales Report",
  "application-recruiter": "Application Recruiter",
} as const;

export const REPORT_OPTIONS = [
  { value: "bsr", label: REPORT_LABELS.bsr },
  { value: "application-recruiter", label: REPORT_LABELS["application-recruiter"] },
] as const;

export const ROLE_CREATE_SCOPE: Record<Role, Role[]> = {
  admin: ["admin", "manager", "assistant_manager", "team_lead", "emp"],
  manager: ["assistant_manager", "team_lead", "emp"],
  assistant_manager: ["team_lead", "emp"],
  team_lead: ["emp"],
  emp: [],
};
