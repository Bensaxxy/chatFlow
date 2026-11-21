"use client";

import {
  Bell,
  BellOff,
  ChevronDown,
  LoaderCircle,
  Mail,
  MailX,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationStatus,
} from "@/services/push-notification.service";

type PushPermission = NotificationPermission | "unsupported";

export default function PushNotificationSettings() {
  const { user, updateNotificationSettings } = useAuth();
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [pendingEmailNotifications, setPendingEmailNotifications] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let isActive = true;

    void getPushNotificationStatus()
      .then((status) => {
        if (!isActive) {
          return;
        }

        setIsSupported(status.isSupported);
        setPermission(status.permission);
        setIsSubscribed(status.isSubscribed);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setIsSupported(false);
        setPermission("unsupported");
        setIsSubscribed(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleToggle = async (): Promise<void> => {
    if (isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);

      if (isSubscribed) {
        await disablePushNotifications();
        setIsSubscribed(false);
        toast.success("Push notifications turned off");

        return;
      }

      const result = await enablePushNotifications();

      setPermission(result.permission);
      setIsSubscribed(result.isSubscribed);

      if (result.permission === "denied") {
        toast.info("Allow notifications in your browser settings to enable them");
      } else if (result.isSubscribed) {
        toast.success("Push notifications are on");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  const emailNotificationsEnabled =
    pendingEmailNotifications ??
    (user?.notificationSettings?.emailNotifications !== false);

  const handleEmailToggle = async (): Promise<void> => {
    if (!user || isUpdatingEmail) {
      return;
    }

    const nextValue = !emailNotificationsEnabled;

    try {
      setPendingEmailNotifications(nextValue);
      setIsUpdatingEmail(true);
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
      setIsUpdatingEmail(false);
    }
  };

  const description = !isSupported
    ? "This browser does not support push notifications."
    : permission === "denied"
      ? "Notifications are blocked in your browser settings."
      : isSubscribed
        ? "You will get message alerts when ChatFlow is in the background."
        : "Get message alerts even when ChatFlow is not open.";

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] shadow-sm">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls="notification-settings-content"
        onClick={() => setIsExpanded((current) => !current)}
        className={`flex w-full items-start gap-3 px-5 py-5 text-left transition hover:bg-[var(--chat-hover)] sm:px-7 ${
          isExpanded ? "border-b border-[var(--chat-border)]" : ""
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
          {isSubscribed ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[var(--chat-text)]">
              Notifications
            </h2>
            {(isUpdating || isUpdatingEmail) && (
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--chat-accent)]" />
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--chat-muted)]">
            Manage browser alerts and email updates.
          </p>
        </div>
        <ChevronDown
          className={`mt-2 h-5 w-5 shrink-0 text-[var(--chat-muted)] transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div id="notification-settings-content" className="space-y-6 p-5 sm:p-7">
          <section>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
                {isSubscribed ? (
                  <Bell className="h-5 w-5" />
                ) : (
                  <BellOff className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--chat-text)]">
                  Push notifications
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">
                  {description}
                </p>
              </div>
            </div>

            {isSupported && (
              <>
                <button
                  type="button"
                  disabled={isUpdating || permission === "denied"}
                  onClick={() => void handleToggle()}
                  className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    isSubscribed
                      ? "border border-[var(--chat-border)] bg-[var(--chat-control)] text-[var(--chat-text)] hover:bg-[var(--chat-hover)]"
                      : "bg-[var(--chat-sent)] text-white hover:bg-[var(--chat-sent-hover)]"
                  }`}
                >
                  {isUpdating ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : isSubscribed ? (
                    <BellOff className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {isSubscribed ? "Turn off notifications" : "Turn on notifications"}
                </button>

                <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-[var(--chat-muted)]">
                  <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  On iPhone or iPad, add ChatFlow to your Home Screen before enabling notifications.
                </p>
              </>
            )}
          </section>

          <section className="border-t border-[var(--chat-border)] pt-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
                {emailNotificationsEnabled ? (
                  <Mail className="h-5 w-5" />
                ) : (
                  <MailX className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--chat-text)]">
                  Email notifications
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">
                  Get an email about new messages while you are away from ChatFlow.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailNotificationsEnabled}
                aria-label="Toggle email notifications"
                disabled={isUpdatingEmail}
                onClick={() => void handleEmailToggle()}
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
        </div>
      )}
    </section>
  );
}
