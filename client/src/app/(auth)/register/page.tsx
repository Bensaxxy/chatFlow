import type { Metadata } from "next";

import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create account | ChatFlow",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Join ChatFlow and start connecting with the people who matter."
    >
      <RegisterForm />
    </AuthShell>
  );
}
