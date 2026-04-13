"use client";

type AppLoadingProps = {
  label?: string;
};

export function AppLoading({ label = "Loading your workspace" }: AppLoadingProps) {
  return (
    <div className="app-loading-screen" aria-live="polite" aria-busy="true">
      <div className="app-loading-skeleton app-loading-skeleton-top" />
      <div className="app-loading-skeleton app-loading-skeleton-side" />
      <div className="app-loading-skeleton app-loading-skeleton-main" />
      <div className="app-loading-center">
        <div className="app-loading-spinner" />
        <p className="app-loading-text">{label}</p>
      </div>
    </div>
  );
}
