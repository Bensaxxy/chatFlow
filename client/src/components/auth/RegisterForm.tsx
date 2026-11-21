"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { isAxiosError } from "axios";

import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage, getApiValidationErrors } from "@/lib/api/errors";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";

export default function RegisterForm() {
  const { register: createAccount } = useAuth();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),

    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    const email = values.email.trim().toLowerCase();

    try {
      await createAccount({
        name: values.name.trim(),
        email,
        password: values.password,
      });

      toast.success(
        "Account created. Check your email for the verification code.",
      );

      const parameters = new URLSearchParams({
        email,
        sent: "1",
      });

      router.replace(`/verify-email?${parameters.toString()}`);
    } catch (error) {
      type ApiErrorData = {
        code?: string;
      };

      const errorCode = isAxiosError<ApiErrorData>(error)
        ? error.response?.data?.code
        : undefined;

      if (errorCode === "EMAIL_ALREADY_EXISTS") {
        toast.info("This account is waiting for email verification.");

        const parameters = new URLSearchParams({ email });

        router.replace(`/verify-email?${parameters.toString()}`);
        return;
      }

      const validationErrors = getApiValidationErrors(error);

      for (const issue of validationErrors) {
        if (
          issue.field === "name" ||
          issue.field === "email" ||
          issue.field === "password"
        ) {
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
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Full name
          </label>

          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              aria-invalid={errors.name ? "true" : "false"}
              {...register("name")}
              className={`w-full rounded-2xl border bg-white/[0.06] py-3 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:ring-4 sm:text-sm ${
                errors.name
                  ? "border-rose-400/80 focus:border-rose-300 focus:ring-rose-400/15"
                  : "border-white/10 focus:border-cyan-300/70 focus:ring-cyan-300/15"
              }`}
            />
          </div>

          {errors.name && (
            <p className="mt-2 text-sm text-rose-300">{errors.name.message}</p>
          )}
        </div>

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
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Confirm password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Enter the password again"
              aria-invalid={errors.confirmPassword ? "true" : "false"}
              {...register("confirmPassword")}
              className={`w-full rounded-2xl border bg-white/[0.06] py-3 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:ring-4 sm:text-sm ${
                errors.confirmPassword
                  ? "border-rose-400/80 focus:border-rose-300 focus:ring-rose-400/15"
                  : "border-white/10 focus:border-cyan-300/70 focus:ring-cyan-300/15"
              }`}
            />
          </div>

          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-rose-300">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-200 via-cyan-300 to-cyan-400 px-4 py-3 font-black text-slate-950 shadow-[0_18px_40px_-16px_rgba(34,211,238,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-16px_rgba(34,211,238,0.95)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <LoaderCircle className="h-5 w-5 animate-spin" />}

          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-cyan-300 transition hover:text-cyan-100"
        >
          Login
        </Link>
      </p>
    </>
  );
}
