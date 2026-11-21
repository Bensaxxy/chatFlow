"use client";

import { ChevronDown, LoaderCircle, Play, Vibrate, Volume2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import { playMessageFeedback } from "@/lib/notifications/message-feedback";
import type { NotificationSettings, NotificationSound } from "@/types/notification";

const soundOptions: Array<{ value: NotificationSound; label: string }> = [
  { value: "chime", label: "Chime" },
  { value: "pulse", label: "Pulse" },
  { value: "pop", label: "Pop" },
  { value: "none", label: "No sound" },
];

const getSettings = (
  settings: Partial<NotificationSettings> | undefined,
): NotificationSettings => ({
  emailNotifications: settings?.emailNotifications !== false,
  messageSound: settings?.messageSound ?? "chime",
  vibration: settings?.vibration !== false,
});

export default function MessageAlertSettings() {
  const { user, updateNotificationSettings } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!user) {
    return null;
  }

  const settings = getSettings(user.notificationSettings);

  const saveSettings = async (
    changes: Partial<NotificationSettings>,
  ): Promise<void> => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await updateNotificationSettings({
        ...settings,
        ...changes,
      });
      toast.success("Alert preferences updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] shadow-sm">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls="message-alert-settings-content"
        onClick={() => setIsExpanded((current) => !current)}
        className={`flex w-full items-start gap-3 px-5 py-5 text-left transition hover:bg-[var(--chat-hover)] sm:px-7 ${
          isExpanded ? "border-b border-[var(--chat-border)]" : ""
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
          <Volume2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[var(--chat-text)]">
              Message alerts
            </h2>
            {isSaving && (
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--chat-accent)]" />
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--chat-muted)]">
            Choose how incoming messages notify you while ChatFlow is open.
          </p>
        </div>
        <ChevronDown
          className={`mt-2 h-5 w-5 shrink-0 text-[var(--chat-muted)] transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div id="message-alert-settings-content" className="space-y-5 p-5 sm:p-7">
        <div>
          <label
            htmlFor="message-sound"
            className="mb-2 block text-sm font-semibold text-[var(--chat-text)]"
          >
            Alert sound
          </label>
          <div className="flex gap-2">
            <select
              id="message-sound"
              value={settings.messageSound}
              disabled={isSaving}
              onChange={(event) =>
                void saveSettings({
                  messageSound: event.target.value as NotificationSound,
                })
              }
              className="min-w-0 flex-1 rounded-xl border border-[var(--chat-border)] bg-[var(--chat-control)] px-3 py-2.5 text-sm text-[var(--chat-text)] outline-none transition focus:border-[var(--chat-accent)] focus:ring-4 focus:ring-[var(--chat-accent-soft)] disabled:cursor-wait disabled:opacity-60"
            >
              {soundOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                playMessageFeedback({
                  sound: settings.messageSound,
                  vibration: settings.vibration,
                })
              }
              disabled={isSaving || settings.messageSound === "none"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--chat-border)] bg-[var(--chat-control)] text-[var(--chat-accent)] transition hover:bg-[var(--chat-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Preview alert sound"
              title="Preview alert sound"
            >
              <Play className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 border-t border-[var(--chat-border)] pt-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
            <Vibrate className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[var(--chat-text)]">
              Vibration
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">
              Vibrate for incoming messages on devices that support it.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.vibration}
            aria-label="Toggle message vibration"
            disabled={isSaving}
            onClick={() => void saveSettings({ vibration: !settings.vibration })}
            className={`relative mt-0.5 flex h-8 w-16 shrink-0 items-center rounded-full px-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm transition-colors disabled:cursor-wait disabled:opacity-60 ${
              settings.vibration
                ? "justify-start bg-[var(--chat-sent)]"
                : "justify-end bg-[var(--chat-muted)]"
            }`}
          >
            <span aria-hidden="true">{settings.vibration ? "On" : "Off"}</span>
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                settings.vibration ? "right-1" : "left-1"
              }`}
            />
          </button>
        </div>
        </div>
      )}
    </section>
  );
}
