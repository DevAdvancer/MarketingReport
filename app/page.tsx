"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLoading } from "@/components/app-loading";
import { fetchSessionState } from "@/lib/api-client";

export default function HomePage() {
  const router = useRouter();
  const [label, setLabel] = useState("Checking your session");

  useEffect(() => {
    let active = true;

    fetchSessionState()
      .then(({ user }) => {
        if (!active) return;

        if (!user) {
          router.replace("/login");
          return;
        }
        router.replace(user.role === "emp" ? "/reports/new" : "/dashboard");
      })
      .catch(() => {
        if (!active) return;
        setLabel("We couldn't verify your session. Redirecting to login...");
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  return <AppLoading label={label} />;
}
