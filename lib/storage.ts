"use client";

export function setActiveReportUser(user: unknown) {
  window.localStorage.setItem("vizva-active-report-user", JSON.stringify(user));
}
