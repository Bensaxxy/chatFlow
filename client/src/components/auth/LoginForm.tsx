"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage, getApiValidationErrors } from "@/lib/api/errors";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { isAxiosError } from "axios";

interface LoginFormProps {
  nextPath?: string;
  initialEmail?: string;
  registrationSucceeded?: boolean;
  verificationSucceeded?: boolean;
  passwordResetSucceeded?: boolean;
}

const getSafeDestination = (destination?: string): string => {
  if (
    !destination ||
    !destination.startsWith("/") ||
    destination.startsWith("//") ||
    destination.startsWith("/login") ||
    destination.startsWith("/register")
  ) {
    return "/chats";
  }

  return destination;
};

export default function LoginForm({
  nextPath,
  initialEmail = "",
  registrationSucceeded = false,
  verificationSucceeded = false,
  passwordResetSucceeded = false,
}: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: initialEmail,
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const user = await login({
        email: values.email.trim(),
        password: values.password,
      });

      toast.success(`Welcome back, ${user.name}`);

      router.replace(getSafeDestination(nextPath));

      router.refresh();
    } catch (error) {
      type ApiErrorData = {
        code?: string;
        message?: string;
      };

      const errorCode = isAxiosError<ApiErrorData>(error)
        ? error.response?.data?.code
        : undefined;

      if (errorCode === "EMAIL_NOT_VERIFIED") {
        toast.info("Verify your email address before logging in.");

        const parameters = new URLSearchParams({
          email: values.email.trim().toLowerCase(),
        });

        router.push(`/verify-email?${parameters.toString()}`);

        return;
      }
      const validationErrors = getApiValidationErrors(error);

      for (const issue of validationErrors) {
        if (issue.field === "email" || issue.field === "password") {
          setError(issue.field, {
            type: "server",
            message: issue.message,
          });
        }
      }

      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <>
      {registrationSucceeded && (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
        >
          Your account was created successfully. You can now log in.
        </div>
      )}

      {verificationSucceeded && (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
        >
          Your email has been verified successfully. You can now log in.
        </div>
      )}

      {passwordResetSucceeded && (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
        >
          Your password has been reset. You can now sign in.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={errors.email ? "true" : "false"}
              {...register("email")}
              className={`w-full rounded-2xl border bg-white/[0.06] py-3 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:ring-4 sm:text-sm ${
                errors.email
                  ? "border-rose-400/80 focus:border-rose-300 focus:ring-rose-400/15"
                  : "border-white/10 focus:border-cyan-300/70 focus:ring-cyan-300/15"
              }`}
            />
          </div>

          {errors.email && (
            <p className="mt-2 text-sm text-rose-300">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-slate-200"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-cyan-300 transition hover:text-cyan-100"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password")}
              className={`w-full rounded-2xl border bg-white/[0.06] py-3 pl-11 pr-12 text-base text-white outline-none transition placeholder:text-slate-500 focus:ring-4 sm:text-sm ${
                errors.password
                  ? "border-rose-400/80 focus:border-rose-300 focus:ring-rose-400/15"
                  : "border-white/10 focus:border-cyan-300/70 focus:ring-cyan-300/15"
              }`}
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {errors.password && (
            <p className="mt-2 text-sm text-rose-300">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-200 via-cyan-300 to-cyan-400 px-4 py-3 font-black text-slate-950 shadow-[0_18px_40px_-16px_rgba(34,211,238,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-16px_rgba(34,211,238,0.95)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <LoaderCircle className="h-5 w-5 animate-spin" />}

          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-bold text-cyan-300 transition hover:text-cyan-100"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
