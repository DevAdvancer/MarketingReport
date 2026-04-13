"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { buildHierarchyLabel, generateEmployeeId, getCreatableRoles, getManagedUsers, getRoleLabel } from "@/lib/rbac";
import { createUser, fetchUsers } from "@/lib/api-client";
import { Role, User } from "@/lib/types";

type FormState = {
  name: string;
  email: string;
  password: string;
  employeeId: string;
  role: Role;
  branch: string;
  department: string;
  designation: string;
  managerId: string;
  assistantManagerId: string;
  teamLeadId: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  employeeId: "",
  role: "emp",
  branch: "AMD",
  department: "Marketing",
  designation: "Bench Sales Recruiter",
  managerId: "",
  assistantManagerId: "",
  teamLeadId: "",
};

function needsManager(role: Role) {
  return role === "assistant_manager" || role === "team_lead" || role === "emp";
}

function needsAssistantManager(role: Role) {
  return role === "team_lead" || role === "emp";
}

function getEffectiveManagerId(currentUser: User, role: Role, selectedManagerId: string) {
  if (currentUser.role === "manager" && needsManager(role)) {
    return currentUser.id;
  }

  if (currentUser.role === "assistant_manager") {
    return currentUser.managerId || "";
  }

  if (currentUser.role === "team_lead") {
    return currentUser.managerId || "";
  }

  return selectedManagerId;
}

function getEffectiveAssistantManagerId(
  currentUser: User,
  role: Role,
  selectedAssistantManagerId: string,
) {
  if (currentUser.role === "assistant_manager" && needsAssistantManager(role)) {
    return currentUser.id;
  }

  if (currentUser.role === "team_lead") {
    return currentUser.assistantManagerId || "";
  }

  return selectedAssistantManagerId;
}

function UsersContent({ user }: { user: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers().then((data) => setUsers(data.users));
  }, []);

  const creatableRoles = getCreatableRoles(user.role);
  const managedUsers = getManagedUsers(user, users);
  const managers = users.filter((entry) => entry.role === "manager");
  const assistants = users.filter((entry) => entry.role === "assistant_manager");
  const leads = users.filter((entry) => entry.role === "team_lead");

  const previewEmployeeId = useMemo(
    () => generateEmployeeId(form.name || "User", form.role, users),
    [form.name, form.role, users],
  );
  const effectiveManagerId = getEffectiveManagerId(user, form.role, form.managerId);
  const effectiveAssistantManagerId = getEffectiveAssistantManagerId(
    user,
    form.role,
    form.assistantManagerId,
  );
  const managerRequired = needsManager(form.role);
  const assistantManagerRequired = needsAssistantManager(form.role);
  const managerLocked = user.role !== "admin";
  const assistantManagerLocked = user.role === "assistant_manager" || user.role === "team_lead";

  useEffect(() => {
    setForm((current) => {
      if (current.employeeId && current.employeeId !== previewEmployeeId) {
        return current;
      }

      return {
        ...current,
        employeeId: previewEmployeeId,
      };
    });
  }, [previewEmployeeId]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      managerId: managerRequired ? getEffectiveManagerId(user, current.role, current.managerId) : "",
      assistantManagerId: assistantManagerRequired
        ? getEffectiveAssistantManagerId(user, current.role, current.assistantManagerId)
        : "",
      teamLeadId: current.role === "emp" ? current.teamLeadId : "",
    }));
  }, [assistantManagerRequired, managerRequired, user]);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creatableRoles.length) {
      setMessage("You do not have permission to create users.");
      return;
    }

    if (managerRequired && !effectiveManagerId) {
      setMessage("Manager selection is required for this role.");
      return;
    }

    if (assistantManagerRequired && !effectiveAssistantManagerId) {
      setMessage("Assistant Manager selection is required for this role.");
      return;
    }

    try {
      const result = await createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        employeeId: form.employeeId,
        role: form.role,
        branch: form.branch,
        department: form.department,
        designation: form.designation,
        managerId: effectiveManagerId,
        assistantManagerId: effectiveAssistantManagerId,
        teamLeadId: form.teamLeadId,
      });
      setUsers((current) => [...current, result.user]);
      setForm(DEFAULT_FORM);
      setMessage(`Created ${result.user.name} with ID ${result.user.employeeId}.`);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to create user.";
      setMessage(nextMessage);
    }
  }

  return (
    <AppShell user={user} title="Users & Access">
      <section className="split-layout">
        <article className="panel">
          <h3>Create User Login</h3>
          <p className="muted">
            Admin can create any role. Managers, Assistant Managers, and Team Leads can create only
            lower roles under them.
          </p>
          {creatableRoles.length ? (
            <form className="form-grid" onSubmit={handleCreateUser}>
              <label className="stack">
                <span>Name</span>
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>
              <label className="stack">
                <span>Email</span>
                <input name="email" value={form.email} onChange={handleChange} required />
              </label>
              <label className="stack">
                <span>Password</span>
                <div className="password-field">
                  <input
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    type={showPassword ? "text" : "password"}
                    required
                  />
                  <button
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? "Hide" : "View"}
                  </button>
                </div>
              </label>
              <label className="stack">
                <span>Role</span>
                <select name="role" value={form.role} onChange={handleChange}>
                  {creatableRoles.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack">
                <span>Employee ID</span>
                <input name="employeeId" value={form.employeeId} onChange={handleChange} required />
              </label>
              <label className="stack">
                <span>Designation</span>
                <input name="designation" value={form.designation} onChange={handleChange} required />
              </label>
              <label className="stack">
                <span>Branch</span>
                <select name="branch" value={form.branch} onChange={handleChange}>
                  <option value="AMD">AMD</option>
                  <option value="GGR">GGR</option>
                  <option value="LKN">LKN</option>
                </select>
              </label>
              <label className="stack">
                <span>Department</span>
                <input
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className="stack">
                <span>Manager{managerRequired ? " *" : ""}</span>
                <select
                  name="managerId"
                  value={effectiveManagerId}
                  onChange={handleChange}
                  required={managerRequired}
                  disabled={!managerRequired || managerLocked}
                >
                  <option value="">{managerRequired ? "Select Manager" : "Auto / None"}</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack">
                <span>Assistant Manager{assistantManagerRequired ? " *" : ""}</span>
                <select
                  name="assistantManagerId"
                  value={effectiveAssistantManagerId}
                  onChange={handleChange}
                  required={assistantManagerRequired}
                  disabled={!assistantManagerRequired || assistantManagerLocked}
                >
                  <option value="">
                    {assistantManagerRequired ? "Select Assistant Manager" : "Auto / None"}
                  </option>
                  {assistants.map((assistant) => (
                    <option key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack">
                <span>Team Lead</span>
                <select name="teamLeadId" value={form.teamLeadId} onChange={handleChange}>
                  <option value="">Auto / None</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary-button" type="submit">
                Create Login
              </button>
            </form>
          ) : (
            <p className="muted">EMP users can view their profile only.</p>
          )}
          {message ? <p className="success-text">{message}</p> : null}
        </article>

        <article className="panel">
          <h3>{user.role === "emp" ? "My Profile" : "Users You Can Manage"}</h3>
          <div className="table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>ID</th>
                  <th>Reporting Chain</th>
                </tr>
              </thead>
              <tbody>
                {(user.role === "emp" ? [user] : managedUsers).map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{getRoleLabel(entry.role)}</td>
                    <td>{entry.employeeId}</td>
                    <td>{buildHierarchyLabel(entry, users) || "Direct assignment"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default function UsersPage() {
  return (
    <AuthGuard>
      {(user) => <UsersContent user={user} />}
    </AuthGuard>
  );
}
