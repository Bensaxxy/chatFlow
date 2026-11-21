"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { getApiErrorMessage, getApiValidationErrors } from "@/lib/api/errors";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth";
import { requestPasswordReset } from "@/services/auth.service";

export default function ForgotPasswordForm() {
  const [isSent, setIsSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues): Promise<void> => {
    try {
      const message = await requestPasswordReset({
        email: values.email.trim().toLowerCase(),
      });

      setIsSent(true);
      toast.success(message);
    } catch (error) {
      for (const issue of getApiValidationErrors(error)) {
        if (issue.field === "email") {
          setError("email", {
            type: "server",
            message: issue.message,
          });
        }
      }

      toast.error(getApiErrorMessage(error));
    }
  };

  if (isSent) {
    return (
      <div>
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100">
          If an account matches that email address, a password reset link is on
          its way. Please check your inbox and spam folder.
        </div>

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    );
  }

  return (
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-200 via-cyan-300 to-cyan-400 px-4 py-3 font-black text-slate-950 shadow-[0_18px_40px_-16px_rgba(34,211,238,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-16px_rgba(34,211,238,0.95)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <LoaderCircle className="h-5 w-5 animate-spin" />}
        {isSubmitting ? "Sending link..." : "Email reset link"}
      </button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>
    </form>
  );
}
