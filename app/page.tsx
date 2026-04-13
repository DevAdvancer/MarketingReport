"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchSessionState } from "@/lib/api-client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    fetchSessionState().then(({ user }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      router.replace(user.role === "emp" ? "/reports/new" : "/dashboard");
    });
  }, [router]);

  return null;
}
