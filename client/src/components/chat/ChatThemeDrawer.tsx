"use client";

import { Check, LoaderCircle, Moon, Palette, Sun, X } from "lucide-react";
import { toast } from "react-toastify";

import { useChatTheme } from "@/contexts/ChatThemeContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import type {
  ChatThemeAppearance,
  ChatThemeBubbleColor,
  ChatThemeWallpaper,
} from "@/types/chat-theme";

interface ChatThemeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const appearances: Array<{
  id: ChatThemeAppearance;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    id: "light",
    label: "Light",
    description: "Bright and crisp",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Easy on your eyes",
    icon: Moon,
  },
];

const wallpapers: Array<{
  id: ChatThemeWallpaper;
  label: string;
  description: string;
}> = [
  { id: "paper", label: "Paper", description: "Clean and calm" },
  { id: "aurora", label: "Aurora", description: "Cool gradients" },
  { id: "midnight", label: "Midnight", description: "Deep and quiet" },
  { id: "blush", label: "Blush", description: "Warm and soft" },
  { id: "mesh", label: "Mesh", description: "Modern texture" },
];

const bubbleColors: Array<{
  id: ChatThemeBubbleColor;
  label: string;
  color: string;
}> = [
  { id: "cyan", label: "Cyan", color: "#0891b2" },
  { id: "violet", label: "Violet", color: "#7c3aed" },
  { id: "emerald", label: "Emerald", color: "#059669" },
  { id: "rose", label: "Rose", color: "#e11d48" },
  { id: "amber", label: "Amber", color: "#d97706" },
];

export default function ChatThemeDrawer({
  isOpen,
  onClose,
}: ChatThemeDrawerProps) {
  const { theme, isSavingTheme, updateTheme } = useChatTheme();

  const applyTheme = async (
    changes: Parameters<typeof updateTheme>[0],
  ): Promise<void> => {
    try {
      await updateTheme(changes);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        aria-label="Close chat theme settings"
        className={[
          "fixed inset-0 z-[150] bg-slate-950/40 backdrop-blur-[1px] transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        aria-label="Chat theme settings"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={[
          "chat-themed-drawer fixed inset-y-0 right-0 z-[160] flex w-full max-w-md flex-col border-l border-[var(--chat-border)] bg-[var(--chat-surface)] text-[var(--chat-text)] shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <header className="flex items-center gap-3 border-b border-[var(--chat-border)] px-4 py-4 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chat-accent-soft)] text-[var(--chat-accent)]">
            <Palette className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Chat theme</h2>
            <p className="mt-0.5 text-xs text-[var(--chat-muted)]">
              Make ChatFlow feel like yours
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat theme settings"
            title="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] transition hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          <section aria-labelledby="appearance-title">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h3 id="appearance-title" className="text-sm font-semibold">
                  Appearance
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">
                  Choose a light or dark chat experience.
                </p>
              </div>

              {isSavingTheme && (
                <LoaderCircle
                  aria-label="Saving theme"
                  className="h-4 w-4 shrink-0 animate-spin text-[var(--chat-accent)]"
                />
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {appearances.map((appearance) => {
                const Icon = appearance.icon;
                const isSelected = theme.appearance === appearance.id;

                return (
                  <button
                    key={appearance.id}
                    type="button"
                    disabled={isSavingTheme}
                    onClick={() => void applyTheme({ appearance: appearance.id })}
                    className={[
                      "relative min-h-24 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-accent)] disabled:cursor-wait disabled:opacity-60",
                      isSelected
                        ? "border-[var(--chat-accent)] bg-[var(--chat-accent-soft)]"
                        : "border-[var(--chat-border)] bg-[var(--chat-control)] hover:bg-[var(--chat-hover)]",
                    ].join(" ")}
                  >
                    <Icon className="h-5 w-5 text-[var(--chat-accent)]" />
                    <span className="mt-3 block text-sm font-semibold">
                      {appearance.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--chat-muted)]">
                      {appearance.description}
                    </span>
                    {isSelected && (
                      <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--chat-accent)] text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="wallpaper-title" className="mt-8">
            <h3 id="wallpaper-title" className="text-sm font-semibold">
              Wallpaper
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">
              Applied to every conversation background.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {wallpapers.map((wallpaper) => {
                const isSelected = theme.wallpaper === wallpaper.id;

                return (
                  <button
                    key={wallpaper.id}
                    type="button"
                    disabled={isSavingTheme}
                    onClick={() => void applyTheme({ wallpaper: wallpaper.id })}
                    className={[
                      "relative overflow-hidden rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-accent)] disabled:cursor-wait disabled:opacity-60",
                      isSelected
                        ? "border-[var(--chat-accent)] ring-1 ring-[var(--chat-accent)]"
                        : "border-[var(--chat-border)] hover:border-[var(--chat-muted)]",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={`chat-wallpaper-swatch chat-wallpaper-swatch-${wallpaper.id} block h-16`}
                    />
                    <span className="block bg-[var(--chat-control)] px-2.5 py-2">
                      <span className="block truncate text-xs font-semibold">
                        {wallpaper.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--chat-muted)]">
                        {wallpaper.description}
                      </span>
                    </span>
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--chat-accent)] text-white shadow-sm">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="bubble-title" className="mt-8">
            <h3 id="bubble-title" className="text-sm font-semibold">
              Your message colour
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--chat-muted)]">
              Pick the colour used for messages you send.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {bubbleColors.map((bubbleColor) => {
                const isSelected = theme.bubbleColor === bubbleColor.id;

                return (
                  <button
                    key={bubbleColor.id}
                    type="button"
                    disabled={isSavingTheme}
                    onClick={() =>
                      void applyTheme({ bubbleColor: bubbleColor.id })
                    }
                    aria-label={`Use ${bubbleColor.label} message bubbles`}
                    title={bubbleColor.label}
                    className={[
                      "relative flex h-12 w-12 items-center justify-center rounded-full border-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--chat-accent)] disabled:cursor-wait disabled:opacity-60",
                      isSelected
                        ? "border-[var(--chat-surface)] ring-2 ring-[var(--chat-accent)]"
                        : "border-transparent hover:scale-105",
                    ].join(" ")}
                    style={{ backgroundColor: bubbleColor.color }}
                  >
                    {isSelected && (
                      <Check className="h-5 w-5 text-white" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-canvas)] p-3">
              <p className="rounded-2xl rounded-br-md bg-[var(--chat-sent)] px-3 py-2 text-right text-xs font-medium text-white shadow-sm">
                This is your message bubble
              </p>
              <p className="mt-2 w-fit rounded-2xl rounded-bl-md border border-[var(--chat-border)] bg-[var(--chat-received)] px-3 py-2 text-xs text-[var(--chat-received-text)] shadow-sm">
                And this is theirs
              </p>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
