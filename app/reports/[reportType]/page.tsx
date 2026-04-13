"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { ReportFormHost } from "@/components/report-form-host";
import { REPORT_LABELS } from "@/lib/mock-data";
import { canManageUser } from "@/lib/rbac";
import { fetchReport, fetchUsers, saveReport } from "@/lib/api-client";
import { setActiveReportUser } from "@/lib/storage";
import { ReportRecord, ReportType, User } from "@/lib/types";

type ReportBridge = {
  exportPDF: () => Promise<void> | void;
  getReportSnapshot: () => Record<string, string>;
  applyReportSnapshot: (snapshot: Record<string, string>) => void;
  showPage?: (pageNumber: number) => void;
};

function ReportViewerContent({ user }: { user: User }) {
  const params = useParams<{ reportType: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportType = params.reportType as ReportType;
  const [users, setUsers] = useState<User[]>([]);
  const [currentReport, setCurrentReport] = useState<ReportRecord | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false);

  useEffect(() => {
    fetchUsers().then((data) => setUsers(data.users));
  }, []);

  const employeeId = searchParams.get("employeeId");
  const reportId = searchParams.get("reportId");
  const autoDownload = searchParams.get("download") === "1";

  useEffect(() => {
    if (!reportId) {
      setCurrentReport(null);
      setHasAutoDownloaded(false);
      return;
    }

    setHasAutoDownloaded(false);
    fetchReport(reportId)
      .then((data) => setCurrentReport(data.report))
      .catch((error) => {
        const nextMessage = error instanceof Error ? error.message : "Unable to load report.";
        setSaveMessage(nextMessage);
      });
  }, [reportId]);

  const selectedUser = useMemo(() => {
    const effectiveEmployeeId = reportId ? currentReport?.employeeId : employeeId;
    return users.find((entry) => entry.id === effectiveEmployeeId) ?? null;
  }, [currentReport?.employeeId, employeeId, reportId, users]);

  function getBridge() {
    return window.__vizvaReportBridge as ReportBridge | undefined;
  }

  function applySnapshotIfReady() {
    if (!currentReport) return;
    const bridge = getBridge();
    bridge?.applyReportSnapshot(currentReport.snapshot);
    if (autoDownload && !hasAutoDownloaded) {
      bridge?.exportPDF();
      setHasAutoDownloaded(true);
    }
  }

  useEffect(() => {
    applySnapshotIfReady();
  }, [currentReport]);

  useEffect(() => {
    if (!selectedUser) return;
    if (user.role !== "admin" && user.id !== selectedUser.id && !canManageUser(user, selectedUser)) {
      router.replace("/reports/new");
      return;
    }
    const manager = users.find((entry) => entry.id === selectedUser.managerId) ?? null;
    const assistant = users.find((entry) => entry.id === selectedUser.assistantManagerId) ?? null;
    const lead = users.find((entry) => entry.id === selectedUser.teamLeadId) ?? null;
    setActiveReportUser({
      ...selectedUser,
      managerName: manager?.name ?? "",
      assistantManagerName: assistant?.name ?? "",
      teamLeadNameDisplay: lead?.name ?? assistant?.name ?? manager?.name ?? "",
    });
  }, [router, selectedUser, user, users]);

  async function persistReport() {
    if (!selectedUser) return;
    const bridge = getBridge();
    if (!bridge) {
      setSaveMessage("The report is still loading. Please try again.");
      return null;
    }

    setIsSaving(true);
    setSaveMessage("");
    try {
      const result = await saveReport({
        id: currentReport?.id,
        reportType,
        employeeId: selectedUser.id,
        snapshot: bridge.getReportSnapshot(),
      });
      setCurrentReport(result.report);
      setSaveMessage(`Saved report for ${result.report.employeeName}.`);
      return { bridge, report: result.report };
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to save report.";
      setSaveMessage(nextMessage);
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveReport() {
    await persistReport();
  }

  async function handleDownload() {
    const result = await persistReport();
    result?.bridge.exportPDF();
  }

  if (!selectedUser) {
    return (
      <AppShell user={user} title="Report Viewer">
        <div className="panel">Please choose an employee before opening a report.</div>
      </AppShell>
    );
  }

  const iframeSrc =
    reportType === "application-recruiter"
      ? "/forms/application-recruiter.html"
      : "/forms/bsr.html";

  return (
    <AppShell
      user={user}
      title={REPORT_LABELS[reportType]}
      contentClassName="content report-content"
      headerActions={
        <div className="report-header-actions">
          <div className="report-header-meta">
            <span className="muted">
              <strong>{selectedUser.name}</strong> ({selectedUser.employeeId})
            </span>
            {currentReport ? (
              <span className="muted">
                Saved {new Date(currentReport.updatedAt).toLocaleString()}
              </span>
            ) : null}
          </div>
          <div className="report-header-buttons">
            <button className="primary-button" onClick={handleSaveReport} type="button">
              {isSaving ? "Saving..." : currentReport ? "Update Report" : "Save Report"}
            </button>
            <button className="secondary-button" onClick={handleDownload} type="button">
              Export PDF
            </button>
          </div>
        </div>
      }
    >
      <div className="report-layout">
        {saveMessage ? <section className="panel report-status-panel"><p className="success-text">{saveMessage}</p></section> : null}
        <section className="iframe-panel report-frame-panel">
          <ReportFormHost htmlPath={iframeSrc} onReady={applySnapshotIfReady} />
        </section>
      </div>
    </AppShell>
  );
}

export default function ReportViewerPage() {
  return (
    <AuthGuard>
      {(user) => <ReportViewerContent user={user} />}
    </AuthGuard>
  );
}
