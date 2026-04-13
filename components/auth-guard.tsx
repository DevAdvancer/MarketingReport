"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { AppLoading } from "@/components/app-loading";
import { fetchSession } from "@/lib/api-client";
import { User } from "@/lib/types";

type AuthGuardProps = {
  children: (user: User) => ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchSession()
      .then((nextUser) => {
        if (!active) return;

        if (!nextUser) {
          router.replace("/login");
          return;
        }
        setUser(nextUser);
      })
      .catch((nextError) => {
        if (!active) return;
        const message =
          nextError instanceof Error ? nextError.message : "Unable to validate your session.";
        setError(message);
        setUser(null);
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (user === undefined) {
    return <AppLoading label="Checking your access" />;
  }

  if (!user) {
    return <AppLoading label={error || "Redirecting to login"} />;
  }

  return <>{children(user)}</>;
}
