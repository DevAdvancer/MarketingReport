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

  useEffect(() => {
    fetchSession().then((nextUser) => {
      if (!nextUser) {
        router.replace("/login");
        return;
      }
      setUser(nextUser);
    });
  }, [router]);

  if (user === undefined) {
    return <AppLoading label="Checking your access" />;
  }

  if (!user) return null;

  return <>{children(user)}</>;
}
