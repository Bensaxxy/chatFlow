"use client";

import { Mail, MailX, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function EmailNotificationSettings() {
  const { user, updateNotificationSettings } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingEmailNotifications, setPendingEmailNotifications] = useState<
    boolean | null
  >(null);

  if (!user) {
    return null;
  }

  const emailNotificationsEnabled =
    pendingEmailNotifications ??
    (user.notificationSettings?.emailNotifications !== false);

  const handleToggle = async (): Promise<void> => {
    if (isUpdating) {
      return;
    }

    const nextValue = !emailNotificationsEnabled;

    try {
      setPendingEmailNotifications(nextValue);
      setIsUpdating(true);

      await updateNotificationSettings({
        emailNotifications: nextValue,
        messageSound: user.notificationSettings?.messageSound ?? "chime",
        vibration: user.notificationSettings?.vibration !== false,
      });

      toast.success(
        `Email notifications ${nextValue ? "enabled" : "disabled"}`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setPendingEmailNotifications(null);
      setIsUpdating(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] shadow-sm">
      <div className="flex items-start gap-3 px-5 py-5 sm:px-7">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
          {emailNotificationsEnabled ? (
            <Mail className="h-5 w-5" />
          ) : (
            <MailX className="h-5 w-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[var(--chat-text)]">
              Email notifications
            </h2>
            {isUpdating && (
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--chat-accent)]" />
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--chat-muted)]">
            Get an email about new messages while you are away from ChatFlow.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={emailNotificationsEnabled}
          aria-label="Toggle email notifications"
          disabled={isUpdating}
          onClick={() => void handleToggle()}
          className={`relative mt-0.5 flex h-8 w-16 shrink-0 items-center rounded-full px-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chat-accent)] disabled:cursor-wait disabled:opacity-60 ${
            emailNotificationsEnabled
              ? "justify-start bg-[var(--chat-sent)]"
              : "justify-end bg-[var(--chat-muted)]"
          }`}
        >
          <span aria-hidden="true">
            {emailNotificationsEnabled ? "On" : "Off"}
          </span>
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
              emailNotificationsEnabled ? "right-1" : "left-1"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
