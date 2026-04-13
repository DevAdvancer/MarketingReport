"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <div className="login-page">
          <div className="login-card">
            <p className="content-kicker">Application Error</p>
            <h1>Something went wrong</h1>
            <p className="muted">
              {error.message || "The app hit an unexpected error while loading this page."}
            </p>
            <button className="primary-button" type="button" onClick={reset}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
