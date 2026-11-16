import { Suspense, type ReactNode } from "react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ChatShell from "@/components/chat/ChatShell";
import FullPageLoader from "@/components/shared/FullPageLoader";

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <Suspense fallback={<FullPageLoader message="Opening ChatFlow..." />}>
      <ProtectedRoute>
        <ChatShell>{children}</ChatShell>
      </ProtectedRoute>
    </Suspense>
  );
}
