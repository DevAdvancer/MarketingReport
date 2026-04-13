import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vizva Marketing Reports",
  description: "Next.js dashboard for Vizva marketing reporting and hierarchy-based access.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
