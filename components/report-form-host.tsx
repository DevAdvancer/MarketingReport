"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ReportFormHostProps = {
  htmlPath: string;
  onReady?: () => void;
};

declare global {
  interface Window {
    __vizvaReportBridge?: {
      exportPDF: () => Promise<void> | void;
      getReportSnapshot: () => Record<string, string>;
      applyReportSnapshot: (snapshot: Record<string, string>) => void;
      showPage?: (pageNumber: number) => void;
    };
    html2canvas?: unknown;
    jspdf?: unknown;
  }
}

function ensureExternalScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-report-lib="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.reportLib = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

export function ReportFormHost({ htmlPath, onReady }: ReportFormHostProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const [error, setError] = useState("");

  const templateId = useMemo(() => htmlPath.replace(/[^\w-]+/g, "-"), [htmlPath]);

  useEffect(() => {
    let cancelled = false;

    async function mountTemplate() {
      try {
        setError("");
        window.__vizvaReportBridge = undefined;

        await Promise.all([
          ensureExternalScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
          ensureExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
        ]);

        const response = await fetch(htmlPath, { cache: "no-store" });
        const html = await response.text();
        if (cancelled || !containerRef.current) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        doc.querySelector(".toolbar")?.remove();

        const styleTag = doc.querySelector("style");
        const bodyMarkup = doc.body.innerHTML;
        const scriptText = Array.from(doc.querySelectorAll("script"))
          .map((script) => script.textContent || "")
          .join("\n");

        if (styleRef.current) {
          styleRef.current.textContent = styleTag?.textContent || "";
        }

        containerRef.current.innerHTML = bodyMarkup;

        const root = containerRef.current;
        root.dataset.reportTemplate = templateId;
        root.classList.add("report-template-host");

        if (scriptText.trim()) {
          // Extract function names to expose them to the window
          // so inline HTML event handlers (like oninput="calcKPI()") can find them.
          const functionRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
          let match;
          const functionNames: string[] = [];
          while ((match = functionRegex.exec(scriptText)) !== null) {
            functionNames.push(match[1]);
          }
          const attachToWindow = functionNames
            .map((name) => `if (typeof ${name} === 'function') window.${name} = ${name};`)
            .join("\n");

          // Run the original report behavior after the form markup has mounted.
          new Function(`${scriptText}\n\n${attachToWindow}`)();
          window.dispatchEvent(new Event("load"));
        }

        if (!cancelled) {
          onReady?.();
        }
      } catch (issue) {
        if (cancelled) return;
        const message = issue instanceof Error ? issue.message : "Unable to load report form.";
        setError(message);
      }
    }

    mountTemplate();

    return () => {
      cancelled = true;
      window.__vizvaReportBridge = undefined;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [htmlPath, onReady, templateId]);

  return (
    <div className="report-host-shell">
      <style ref={styleRef} />
      {error ? <p className="error-text">{error}</p> : null}
      <div ref={containerRef} className="report-host-body" />
    </div>
  );
}
