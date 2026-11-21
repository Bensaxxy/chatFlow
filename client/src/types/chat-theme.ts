export const CHAT_THEME_APPEARANCES = ["light", "dark"] as const;

export const CHAT_THEME_WALLPAPERS = [
  "paper",
  "aurora",
  "midnight",
  "blush",
  "mesh",
] as const;

export const CHAT_THEME_BUBBLE_COLORS = [
  "cyan",
  "violet",
  "emerald",
  "rose",
  "amber",
] as const;

export type ChatThemeAppearance = (typeof CHAT_THEME_APPEARANCES)[number];
export type ChatThemeWallpaper = (typeof CHAT_THEME_WALLPAPERS)[number];
export type ChatThemeBubbleColor =
  (typeof CHAT_THEME_BUBBLE_COLORS)[number];

export interface ChatThemeSettings {
  appearance: ChatThemeAppearance;
  wallpaper: ChatThemeWallpaper;
  bubbleColor: ChatThemeBubbleColor;
}

export const DEFAULT_CHAT_THEME: ChatThemeSettings = {
  appearance: "light",
  wallpaper: "paper",
  bubbleColor: "cyan",
};
