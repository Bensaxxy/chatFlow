"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage, getApiValidationErrors } from "@/lib/api/errors";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";

export default function RegisterForm() {
  const { register: createAccount } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

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
    try {
      await createAccount({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });

      setRegisteredEmail(values.email.trim());

      toast.success("Account created successfully");
    } catch (error) {
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

  if (registeredEmail) {
    const loginUrl = `/login?registered=1&email=${encodeURIComponent(
      registeredEmail,
    )}`;

    return (
      <div role="status" className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>

        <h2 className="mt-5 text-2xl font-bold text-slate-950">
          Account created!
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account for{" "}
          <span className="font-semibold text-slate-800">
            {registeredEmail}
          </span>{" "}
          was created successfully.
        </p>

        <Link
          href={loginUrl}
          className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-700"
        >
          Continue to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Full name
          </label>

          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              aria-invalid={errors.name ? "true" : "false"}
              {...register("name")}
              className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:ring-4 ${
                errors.name
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-100"
              }`}
            />
          </div>

          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

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
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Confirm password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Enter the password again"
              aria-invalid={errors.confirmPassword ? "true" : "false"}
              {...register("confirmPassword")}
              className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:ring-4 ${
                errors.confirmPassword
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-100"
              }`}
            />
          </div>

          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <LoaderCircle className="h-5 w-5 animate-spin" />}

          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-cyan-700 hover:text-cyan-800"
        >
          Login
        </Link>
      </p>
    </>
  );
}
