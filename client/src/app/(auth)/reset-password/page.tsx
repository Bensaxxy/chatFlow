import type { Metadata } from "next";

import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose New Password | ChatFlow",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const parameters = await searchParams;

  return (
    <AuthShell
      title="Choose a new password"
      description="Use a strong password you do not use elsewhere."
    >
      <ResetPasswordForm token={parameters.token ?? ""} />
    </AuthShell>
  );
}
