import type { Metadata } from "next";

import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login | ChatFlow",
};

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    registered?: string;
    verified?: string;
    reset?: string;
    email?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      description="Log in to continue your conversations."
    >
      <LoginForm
        nextPath={parameters.next}
        initialEmail={parameters.email}
        registrationSucceeded={parameters.registered === "1"}
        verificationSucceeded={parameters.verified === "1"}
        passwordResetSucceeded={parameters.reset === "1"}
      />
    </AuthShell>
  );
}
