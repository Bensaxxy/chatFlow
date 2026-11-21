import type { Metadata } from "next";

import AuthShell from "@/components/auth/AuthShell";
import VerifyEmailForm from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify Email | ChatFlow",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{
    email?: string;
    sent?: string;
  }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const parameters = await searchParams;

  return (
    <AuthShell
      title="Verify your email"
      description="Confirm that this email address belongs to you."
    >
      <VerifyEmailForm
        initialEmail={parameters.email ?? ""}
        codeRecentlySent={parameters.sent === "1"}
      />
    </AuthShell>
  );
}
