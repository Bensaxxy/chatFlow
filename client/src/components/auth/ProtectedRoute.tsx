"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import FullPageLoader from "@/components/shared/FullPageLoader";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { isAuthenticated, isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading || isAuthenticated) {
      return;
    }

    const destination = `${pathname}${window.location.search}`;

    router.replace(`/login?next=${encodeURIComponent(destination)}`);
  }, [isAuthenticated, isAuthLoading, pathname, router]);

  if (isAuthLoading) {
    return <FullPageLoader message="Restoring your session..." />;
  }

  if (!isAuthenticated) {
    return <FullPageLoader message="Redirecting to login..." />;
  }

  return children;
}
