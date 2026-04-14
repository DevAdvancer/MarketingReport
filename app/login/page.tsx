"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLoading } from "@/components/app-loading";
import { createAdmin, fetchSessionState, login } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    fetchSessionState()
      .then((session) => {
        if (!active) return;

        const { user, setupRequired: nextSetupRequired } = session;
        if (user) {
          router.replace(user.role === "emp" ? "/reports/new" : "/dashboard");
          return;
        }

        setSetupRequired(nextSetupRequired);
      })
      .catch((nextError) => {
        if (!active) return;
        const message =
          nextError instanceof Error ? nextError.message : "Unable to check session.";
        setError(message);
      })
      .finally(() => {
        if (!active) return;
        setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const session = await login(email, password);
      router.replace(session.role === "emp" ? "/reports/new" : "/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      setError(message);
      return;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdminSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreatingAdmin) return;
    setError("");
    setIsCreatingAdmin(true);
    try {
      const result = await createAdmin({ name, email, password });
      router.replace(result.user.role === "emp" ? "/reports/new" : "/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create admin.";
      setError(message);
    } finally {
      setIsCreatingAdmin(false);
    }
  }

  if (checkingSession) {
    return <AppLoading label="Preparing sign in" />;
  }

  return (
    <div className="login-page">
      {setupRequired ? (
        <form className="login-card" onSubmit={handleAdminSetup}>
          <p className="content-kicker">First-Time Setup</p>
          <h1>Create Admin</h1>
          <p className="muted">
            Create the first admin account here. After that, you can add the rest of the users from
            the Users page.
          </p>

          <label className="stack">
            <span>Admin Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required disabled={isCreatingAdmin} />
          </label>

          <label className="stack">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              disabled={isCreatingAdmin}
            />
          </label>

          <label className="stack">
            <span>Password</span>
            <div className="password-field">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                required
                disabled={isCreatingAdmin}
              />
              <button
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
                disabled={isCreatingAdmin}
              >
                {showPassword ? "Hide" : "View"}
              </button>
            </div>
          </label>

          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={isCreatingAdmin}>
            {isCreatingAdmin ? "Creating admin..." : "Create Admin Account"}
          </button>
        </form>
      ) : (
        <form className="login-card" onSubmit={handleSubmit}>
          <p className="content-kicker">Secure Access</p>
          <h1>Vizva Report Portal</h1>
          <p className="muted">Sign in with the account created by your admin.</p>

          <label className="stack">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              disabled={isSubmitting}
            />
          </label>

          <label className="stack">
            <span>Password</span>
            <div className="password-field">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                required
                disabled={isSubmitting}
              />
              <button
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
                disabled={isSubmitting}
              >
                {showPassword ? "Hide" : "View"}
              </button>
            </div>
          </label>

          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>
      )}
    </div>
  );
}
