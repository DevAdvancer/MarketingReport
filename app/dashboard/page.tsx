"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { buildHierarchyLabel, getManagedUsers, getRoleLabel } from "@/lib/rbac";
import { fetchUsers } from "@/lib/api-client";
import { User } from "@/lib/types";

function DashboardContent({ user }: { user: User }) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers().then((data) => setUsers(data.users));
  }, []);

  if (user.role === "emp") {
    return (
      <AppShell user={user} title="My Reports">
        <div className="panel">EMP users do not have the dashboard view. Use New Report.</div>
      </AppShell>
    );
  }

  const managedUsers = getManagedUsers(user, users);

  return (
    <AppShell user={user} title="Dashboard">
      <section className="metrics-grid">
        <article className="panel">
          <p className="metric-label">Your Role</p>
          <h3>{getRoleLabel(user.role)}</h3>
        </article>
        <article className="panel">
          <p className="metric-label">Managed Users</p>
          <h3>{managedUsers.length}</h3>
        </article>
        <article className="panel">
          <p className="metric-label">Access Scope</p>
          <h3>{user.role === "admin" ? "All roles" : "Assigned users only"}</h3>
        </article>
      </section>

      <section className="panel">
        <h3>Assigned Team</h3>
        <div className="table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Employee ID</th>
                <th>Reporting</th>
              </tr>
            </thead>
            <tbody>
              {managedUsers.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{getRoleLabel(member.role)}</td>
                  <td>{member.employeeId}</td>
                  <td>{buildHierarchyLabel(member, users) || "Direct assignment"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      {(user) => <DashboardContent user={user} />}
    </AuthGuard>
  );
}
