"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { REPORT_LABELS, REPORT_OPTIONS } from "@/lib/mock-data";
import { getManagedUsers } from "@/lib/rbac";
import { fetchReports, fetchUsers } from "@/lib/api-client";
import { ReportRecord, ReportType, User } from "@/lib/types";

function getDefaultReportTypeForDesignation(designation: string | undefined) {
  const normalizedDesignation = (designation || "").toLowerCase();
  if (normalizedDesignation.includes("bench sales")) {
    return "bsr" as ReportType;
  }

  if (normalizedDesignation.includes("application recruiter")) {
    return "application-recruiter" as ReportType;
  }

  return "bsr" as ReportType;
}

function NewReportContent({ user }: { user: User }) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => {
    fetchUsers().then((data) => setUsers(data.users));
    fetchReports().then((data) => setReports(data.reports.slice(0, 5)));
  }, []);

  const employeeOptions = user.role === "emp" ? [user] : getManagedUsers(user, users);
  const [reportType, setReportType] = useState<ReportType>("bsr");
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    if (!selectedUserId && employeeOptions[0]) {
      setSelectedUserId(employeeOptions[0].id);
    }
  }, [employeeOptions, selectedUserId]);

  const selectedUser = useMemo(
    () => employeeOptions.find((entry) => entry.id === selectedUserId),
    [employeeOptions, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUser) return;
    setReportType(getDefaultReportTypeForDesignation(selectedUser.designation));
  }, [selectedUser]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUserId) return;
    router.push(`/reports/${reportType}?employeeId=${selectedUserId}`);
  }

  return (
    <AppShell user={user} title="New Report">
      <section className="split-layout">
        <article className="panel">
          <h3>Create Report</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="stack">
              <span>Form</span>
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value as ReportType)}
              >
                {REPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack">
              <span>Employee</span>
              <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                {employeeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.employeeId})
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit">
              Open Report
            </button>
          </form>
        </article>

        <article className="panel">
          <h3>Auto-Filled Basic Details</h3>
          {selectedUser ? (
            <div className="preview-card">
              <p>
                <strong>Name:</strong> {selectedUser.name}
              </p>
              <p>
                <strong>EMP ID:</strong> {selectedUser.employeeId}
              </p>
              <p>
                <strong>Designation:</strong> {selectedUser.designation}
              </p>
              <p>
                <strong>Department:</strong> {selectedUser.department}
              </p>
              <p>
                <strong>Branch:</strong> {selectedUser.branch}
              </p>
            </div>
          ) : (
            <p className="muted">No employee available for this role.</p>
          )}
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Recent History</h3>
            <p className="muted">Jump back into recently saved reports.</p>
          </div>
          <Link className="table-link" href="/reports/history">
            View all history
          </Link>
        </div>
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Report</th>
                <th>Month</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.length ? (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.employeeName}</td>
                    <td>{REPORT_LABELS[report.reportType]}</td>
                    <td>{report.reviewMonth || "-"}</td>
                    <td>{new Date(report.updatedAt).toLocaleString()}</td>
                    <td>
                      <Link
                        className="table-link"
                        href={`/reports/${report.reportType}?reportId=${report.id}`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="muted">
                    No report history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

export default function NewReportPage() {
  return (
    <AuthGuard>
      {(user) => <NewReportContent user={user} />}
    </AuthGuard>
  );
}
