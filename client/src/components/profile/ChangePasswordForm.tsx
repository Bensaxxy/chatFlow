"use client";

import {
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function ChangePasswordForm() {
  const router = useRouter();

  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);

  const newPasswordIsValid =
    newPassword.length >= 8 && newPassword.length <= 72;

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const passwordHasChanged =
    currentPassword.length > 0 && newPassword !== currentPassword;

  const formIsValid =
    currentPassword.length > 0 &&
    newPasswordIsValid &&
    passwordsMatch &&
    passwordHasChanged;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!formIsValid || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const message = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast.success(message);

      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] shadow-sm">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls="change-password-content"
        onClick={() => setIsExpanded((current) => !current)}
        className={`flex w-full items-start gap-3 px-5 py-5 text-left transition hover:bg-[var(--chat-hover)] sm:px-7 ${
          isExpanded ? "border-b border-[var(--chat-border)]" : ""
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
          <KeyRound className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-[var(--chat-text)]">Change password</span>
            {isSubmitting && (
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--chat-accent)]" />
            )}
          </span>

          <span className="mt-1 block text-sm leading-6 text-[var(--chat-muted)]">
            Update your account password. You will need to sign in again after
            changing it.
          </span>
        </div>
        <ChevronDown
          className={`mt-2 h-5 w-5 shrink-0 text-[var(--chat-muted)] transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <form id="change-password-content" onSubmit={handleSubmit}>
          <div className="space-y-5 p-5 sm:p-7">
        <div>
          <label
            htmlFor="current-password"
            className="mb-2 block text-sm font-semibold text-[var(--chat-text)]"
          >
            Current password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="current-password"
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-[var(--chat-border)] bg-[var(--chat-control)] py-3 pl-11 pr-12 text-sm text-[var(--chat-text)] outline-none transition focus:border-[var(--chat-accent)] focus:ring-4 focus:ring-[var(--chat-accent-soft)]"
            />

            <button
              type="button"
              onClick={() => setShowCurrentPassword((current) => !current)}
              aria-label={
                showCurrentPassword
                  ? "Hide current password"
                  : "Show current password"
              }
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
            >
              {showCurrentPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="new-password"
            className="mb-2 block text-sm font-semibold text-[var(--chat-text)]"
          >
            New password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-[var(--chat-border)] bg-[var(--chat-control)] py-3 pl-11 pr-12 text-sm text-[var(--chat-text)] outline-none transition focus:border-[var(--chat-accent)] focus:ring-4 focus:ring-[var(--chat-accent-soft)]"
            />

            <button
              type="button"
              onClick={() => setShowNewPassword((current) => !current)}
              aria-label={
                showNewPassword ? "Hide new password" : "Show new password"
              }
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <p
            className={`mt-1.5 text-xs ${
              newPassword.length === 0 || newPasswordIsValid
                ? "text-[var(--chat-muted)]"
                : "text-red-600"
            }`}
          >
            Use between 8 and 72 characters.
          </p>

          {newPassword.length > 0 && !passwordHasChanged && (
            <p className="mt-1 text-xs text-red-600">
              New password must be different from your current password.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-sm font-semibold text-[var(--chat-text)]"
          >
            Confirm new password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-[var(--chat-border)] bg-[var(--chat-control)] py-3 pl-11 pr-12 text-sm text-[var(--chat-text)] outline-none transition focus:border-[var(--chat-accent)] focus:ring-4 focus:ring-[var(--chat-accent-soft)]"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={
                showConfirmPassword
                  ? "Hide password confirmation"
                  : "Show password confirmation"
              }
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1.5 text-xs text-red-600">
              Password confirmation does not match.
            </p>
          )}
        </div>
          </div>

          <div className="flex justify-end border-t border-[var(--chat-border)] bg-[var(--chat-canvas)] px-5 py-4 sm:px-7">
            <button
              type="submit"
              disabled={!formIsValid || isSubmitting}
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-[var(--chat-sent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--chat-sent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Change password
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
