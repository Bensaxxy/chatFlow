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

interface LoginFormProps {
  nextPath?: string;
  initialEmail?: string;
  registrationSucceeded?: boolean;
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
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Your account was created successfully. You can now log in.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={errors.email ? "true" : "false"}
              {...register("email")}
              className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:ring-4 ${
                errors.email
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-100"
              }`}
            />
          </div>

          {errors.email && (
            <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password")}
              className={`w-full rounded-xl border bg-white py-3 pl-11 pr-12 text-slate-900 outline-none transition focus:ring-4 ${
                errors.password
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-100"
              }`}
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {errors.password && (
            <p className="mt-2 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <LoaderCircle className="h-5 w-5 animate-spin" />}

          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-cyan-700 hover:text-cyan-800"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
