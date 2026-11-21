"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { getApiErrorMessage, getApiValidationErrors } from "@/lib/api/errors";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validations/auth";
import { resetPassword } from "@/services/auth.service";

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues): Promise<void> => {
    try {
      const message = await resetPassword({
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });

      toast.success(message);
      router.replace("/login?reset=1");
      router.refresh();
    } catch (error) {
      for (const issue of getApiValidationErrors(error)) {
        if (issue.field === "newPassword" || issue.field === "confirmPassword") {
          setError(issue.field, {
            type: "server",
            message: issue.message,
          });
        }
      }

      toast.error(getApiErrorMessage(error));
    }
  };

  if (!/^[a-f\d]{64}$/i.test(token)) {
    return (
      <div>
        <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm leading-6 text-rose-100">
          This password reset link is invalid. Please request a new one.
        </div>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex text-sm font-bold text-cyan-300 transition hover:text-cyan-100"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div>
        <label
          htmlFor="new-password"
          className="mb-2 block text-sm font-semibold text-slate-200"
        >
          New password
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={errors.newPassword ? "true" : "false"}
            {...register("newPassword")}
            className={`w-full rounded-2xl border bg-white/[0.06] py-3 pl-11 pr-12 text-base text-white outline-none transition placeholder:text-slate-500 focus:ring-4 sm:text-sm ${
              errors.newPassword
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
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="mt-2 text-sm text-rose-300">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="mb-2 block text-sm font-semibold text-slate-200"
        >
          Confirm new password
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            id="confirm-password"
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
        {isSubmitting ? "Resetting password..." : "Reset password"}
      </button>
    </form>
  );
}
