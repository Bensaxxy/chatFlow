"use client";

import { Check, CheckCheck, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PrivacySettings as PrivacySettingsValue, PrivacyVisibility } from "@/types/privacy";

const visibilityOptions: Array<{
  value: PrivacyVisibility;
  label: string;
  description: string;
  icon: typeof Eye;
}> = [
  {
    value: "everyone",
    label: "Everyone",
    description: "Visible to anyone you chat with.",
    icon: Eye,
  },
  {
    value: "nobody",
    label: "Nobody",
    description: "Keep this information private.",
    icon: EyeOff,
  },
];

interface VisibilitySettingProps {
  title: string;
  description: string;
  value: PrivacyVisibility;
  disabled: boolean;
  onChange: (value: PrivacyVisibility) => void;
}

function VisibilitySetting({
  title,
  description,
  value,
  disabled,
  onChange,
}: VisibilitySettingProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-[var(--chat-text)]">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">{description}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {visibilityOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={`relative flex min-h-20 items-start gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-wait disabled:opacity-60 ${
                isSelected
                  ? "border-[var(--chat-accent)] bg-[var(--chat-accent-soft)]"
                  : "border-[var(--chat-border)] bg-[var(--chat-control)] hover:bg-[var(--chat-hover)]"
              }`}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-surface)] text-[var(--chat-accent)] shadow-sm">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--chat-text)]">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-[var(--chat-muted)]">
                  {option.description}
                </span>
              </span>
              {isSelected && (
                <Check className="h-4 w-4 shrink-0 text-[var(--chat-accent)]" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function PrivacySettings() {
  const { user, updatePrivacySettings } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return null;
  }

  const privacySettings = user.privacySettings;

  const saveSettings = async (
    changes: Partial<PrivacySettingsValue>,
  ): Promise<void> => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await updatePrivacySettings({
        ...privacySettings,
        ...changes,
      });
      toast.success("Privacy settings updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] shadow-sm">
      <header className="flex items-start gap-3 border-b border-[var(--chat-border)] px-5 py-5 sm:px-7">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[var(--chat-text)]">Privacy</h2>
            {isSaving && <LoaderCircle className="h-4 w-4 animate-spin text-[var(--chat-accent)]" />}
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--chat-muted)]">
            Decide what other people can see about you.
          </p>
        </div>
      </header>

      <div className="space-y-7 p-5 sm:p-7">
        <VisibilitySetting
          title="Profile photo"
          description="Choose who can see your profile photo across ChatFlow."
          value={privacySettings.profilePhotoVisibility}
          disabled={isSaving}
          onChange={(profilePhotoVisibility) =>
            void saveSettings({ profilePhotoVisibility })
          }
        />

        <VisibilitySetting
          title="Last seen and online"
          description="This controls both your last seen time and live online status."
          value={privacySettings.lastSeenVisibility}
          disabled={isSaving}
          onChange={(lastSeenVisibility) =>
            void saveSettings({ lastSeenVisibility })
          }
        />

        <section className="border-t border-[var(--chat-border)] pt-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
              <CheckCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--chat-text)]">Read receipts</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">
                Let people know when you have read their messages. Typing indicators are unchanged.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={privacySettings.readReceipts}
              aria-label="Toggle read receipts"
              disabled={isSaving}
              onClick={() =>
                void saveSettings({ readReceipts: !privacySettings.readReceipts })
              }
              className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition disabled:cursor-wait disabled:opacity-60 ${
                privacySettings.readReceipts
                  ? "bg-[var(--chat-sent)]"
                  : "bg-[var(--chat-border)]"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  privacySettings.readReceipts ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
