"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { fetchReports } from "@/lib/api-client";
import { REPORT_LABELS } from "@/lib/mock-data";
import { ReportRecord, User } from "@/lib/types";

function ReportHistoryContent({ user }: { user: User }) {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReports()
      .then((data) => setReports(data.reports))
      .catch((issue) => {
        const message = issue instanceof Error ? issue.message : "Unable to load history.";
        setError(message);
      });
  }, []);

  return (
    <AppShell user={user} title="Report History">
      <section className="panel">
        <h3>Previous Reports</h3>
        <p className="muted">Open any saved report again or download that exact report as a PDF.</p>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Report</th>
                <th>Review Month</th>
                <th>Score</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length ? (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.employeeName}</strong>
                      <div className="table-subtext">{report.employeeCode}</div>
                    </td>
                    <td>{REPORT_LABELS[report.reportType]}</td>
                    <td>{report.reviewMonth || "-"}</td>
                    <td>
                      {report.overallScore || "-"}
                      <div className="table-subtext">{report.ratingLabel || "Pending"}</div>
                    </td>
                    <td>{new Date(report.updatedAt).toLocaleString()}</td>
                    <td>
                      <div className="inline-actions">
                        <Link
                          className="table-link"
                          href={`/reports/${report.reportType}?reportId=${report.id}`}
                        >
                          Open
                        </Link>
                        <Link
                          className="table-link"
                          href={`/reports/${report.reportType}?reportId=${report.id}&download=1`}
                        >
                          PDF
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="muted">
                    No saved reports yet.
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

export default function ReportHistoryPage() {
  return <AuthGuard>{(user) => <ReportHistoryContent user={user} />}</AuthGuard>;
}
