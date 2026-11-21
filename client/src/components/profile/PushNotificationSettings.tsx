"use client";

import { Bell, BellOff, LoaderCircle, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { getApiErrorMessage } from "@/lib/api/errors";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationStatus,
} from "@/services/push-notification.service";

type PushPermission = NotificationPermission | "unsupported";

export default function PushNotificationSettings() {
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const status = await getPushNotificationStatus();

      setIsSupported(status.isSupported);
      setPermission(status.permission);
      setIsSubscribed(status.isSubscribed);
    } catch {
      setIsSupported(false);
      setPermission("unsupported");
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

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

  const description = !isSupported
    ? "This browser does not support push notifications."
    : permission === "denied"
      ? "Notifications are blocked in your browser settings."
      : isSubscribed
        ? "You will get message alerts when ChatFlow is in the background."
        : "Get message alerts even when ChatFlow is not open.";

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] shadow-sm">
      <div className="flex items-start gap-3 px-5 py-5 sm:px-7">
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
              Push notifications
            </h2>
            {isUpdating && (
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--chat-accent)]" />
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--chat-muted)]">
            {description}
          </p>
        </div>
      </div>

      {isSupported && (
        <div className="border-t border-[var(--chat-border)] bg-[var(--chat-canvas)] px-5 py-4 sm:px-7">
          <button
            type="button"
            disabled={isUpdating || permission === "denied"}
            onClick={() => void handleToggle()}
            className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
              isSubscribed
                ? "border border-[var(--chat-border)] bg-[var(--chat-surface)] text-[var(--chat-text)] hover:bg-[var(--chat-hover)]"
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
        </div>
      )}
    </section>
  );
}
