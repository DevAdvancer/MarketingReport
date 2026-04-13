"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { getRoleLabel } from "@/lib/rbac";
import { User } from "@/lib/types";
import { logout } from "@/lib/api-client";

type AppShellProps = {
  user: User;
  title: string;
  children: ReactNode;
  contentClassName?: string;
  headerActions?: ReactNode;
};

export function AppShell({ user, title, children, contentClassName, headerActions }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems =
    user.role === "emp"
      ? [
          { label: "My Reports", href: "/reports/new" },
          { label: "History", href: "/reports/history" },
          { label: "Profile", href: "/users" },
          { label: "Logout", href: "#" },
        ]
      : [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Users", href: "/users" },
          { label: "New Report", href: "/reports/new" },
          { label: "History", href: "/reports/history" },
          { label: "Logout", href: "#" },
        ];

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div>
          <p className="sidebar-kicker">Vizva Marketing</p>
          <h1 className="sidebar-title">Report Portal</h1>
          <p className="sidebar-user">{user.name}</p>
          <p className="sidebar-role">{getRoleLabel(user.role)}</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) =>
            item.label === "Logout" ? (
              <button key={item.label} className="sidebar-link" onClick={handleLogout} type="button">
                {item.label}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </aside>

      <main className={`content ${contentClassName ?? ""}`.trim()}>
        <header className="content-header">
          <div>
            <p className="content-kicker">Role-Based Access</p>
            <h2>{title}</h2>
          </div>
          {headerActions ? <div className="content-header-actions">{headerActions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
