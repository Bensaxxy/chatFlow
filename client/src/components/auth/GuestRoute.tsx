"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import FullPageLoader from "@/components/shared/FullPageLoader";
import { useAuth } from "@/contexts/AuthContext";

interface GuestRouteProps {
  children: ReactNode;
}

export default function GuestRoute({ children }: GuestRouteProps) {
  const router = useRouter();

  const { isAuthenticated, isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/chats");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  if (isAuthLoading) {
    return <FullPageLoader message="Checking your session..." />;
  }

  if (isAuthenticated) {
    return <FullPageLoader message="Opening your conversations..." />;
  }

  return children;
}
