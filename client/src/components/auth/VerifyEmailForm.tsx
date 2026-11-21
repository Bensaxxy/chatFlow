"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { getApiErrorMessage, getApiValidationErrors } from "@/lib/api/errors";
import {
  verifyEmailSchema,
  type VerifyEmailFormValues,
} from "@/lib/validations/auth";
import {
  resendEmailVerificationCode,
  verifyEmailAddress,
} from "@/services/auth.service";

interface VerifyEmailFormProps {
  initialEmail?: string;
  codeRecentlySent?: boolean;
}

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailForm({
  initialEmail = "",
  codeRecentlySent = false,
}: VerifyEmailFormProps) {
  const router = useRouter();

  const [resendSeconds, setResendSeconds] = useState(
    codeRecentlySent ? RESEND_COOLDOWN_SECONDS : 0,
  );

  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),

    defaultValues: {
      email: initialEmail,
      code: "",
    },
  });

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setResendSeconds((currentSeconds) => Math.max(0, currentSeconds - 1));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [resendSeconds]);

  const onSubmit = async (values: VerifyEmailFormValues): Promise<void> => {
    try {
      await verifyEmailAddress({
        email: values.email.trim().toLowerCase(),
        code: values.code,
      });

      toast.success("Email verified successfully");

      const parameters = new URLSearchParams({
        verified: "1",
        email: values.email.trim().toLowerCase(),
      });

      router.replace(`/login?${parameters.toString()}`);
    } catch (error) {
      const validationErrors = getApiValidationErrors(error);

      for (const issue of validationErrors) {
        if (issue.field === "email" || issue.field === "code") {
          setError(issue.field, {
            type: "server",
            message: issue.message,
          });
        }
      }

      toast.error(getApiErrorMessage(error));
    }
  };

  const handleResend = async (): Promise<void> => {
    const email = getValues("email").trim().toLowerCase();

    if (!email) {
      setError("email", {
        type: "manual",
        message: "Enter your email address before requesting another code",
      });

      return;
    }

    try {
      setIsResending(true);

      const message = await resendEmailVerificationCode({
        email,
      });

      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setValue("code", "");

      toast.success(message);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">
          <ShieldCheck className="h-8 w-8" />
        </div>
      </div>

      {codeRecentlySent && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

          <p>
            Your account was created. We sent a verification code to your email
            address.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="verification-email"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              id="verification-email"
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
            htmlFor="verification-code"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Verification code
          </label>

          <input
            id="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            aria-invalid={errors.code ? "true" : "false"}
            {...register("code", {
              onChange: (event) => {
                const sanitizedValue = String(event.target.value)
                  .replace(/\D/g, "")
                  .slice(0, 6);

                setValue("code", sanitizedValue, {
                  shouldValidate: false,
                });
              },
            })}
            className={`w-full rounded-2xl border bg-white/[0.06] px-4 py-4 text-center text-2xl font-black tracking-[0.45em] text-white outline-none transition placeholder:text-slate-600 focus:ring-4 ${
              errors.code
                ? "border-rose-400/80 focus:border-rose-300 focus:ring-rose-400/15"
                : "border-white/10 focus:border-cyan-300/70 focus:ring-cyan-300/15"
            }`}
          />

          {errors.code ? (
            <p className="mt-2 text-sm text-rose-300">{errors.code.message}</p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Enter the six-digit code sent to your email. The code expires
              after 10 minutes.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isResending}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-200 via-cyan-300 to-cyan-400 px-4 py-3 font-black text-slate-950 shadow-[0_18px_40px_-16px_rgba(34,211,238,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-16px_rgba(34,211,238,0.95)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <LoaderCircle className="h-5 w-5 animate-spin" />}

          {isSubmitting ? "Verifying..." : "Verify email"}
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-sm text-slate-400">Didn&apos;t receive the code?</p>

        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={isResending || isSubmitting || resendSeconds > 0}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-cyan-300 transition hover:bg-white/[0.06] hover:text-cyan-100 disabled:cursor-not-allowed disabled:text-slate-500"
        >
          {isResending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}

          {isResending
            ? "Sending..."
            : resendSeconds > 0
              ? `Resend in ${resendSeconds}s`
              : "Resend verification code"}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already verified?{" "}
        <Link
          href="/login"
          className="font-bold text-cyan-300 transition hover:text-cyan-100"
        >
          Return to login
        </Link>
      </p>
    </>
  );
}
