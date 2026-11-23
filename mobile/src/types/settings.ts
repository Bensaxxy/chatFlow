export type ChatThemeAppearance = "light" | "dark";
export type ChatThemeWallpaper = "paper" | "aurora" | "midnight" | "blush" | "mesh";
export type ChatThemeBubbleColor = "cyan" | "violet" | "emerald" | "rose" | "amber";

export interface ChatThemeSettings {
  appearance: ChatThemeAppearance;
  wallpaper: ChatThemeWallpaper;
  bubbleColor: ChatThemeBubbleColor;
}

export type PrivacyVisibility = "everyone" | "nobody";

export interface PrivacySettings {
  profilePhotoVisibility: PrivacyVisibility;
  lastSeenVisibility: PrivacyVisibility;
  readReceipts: boolean;
}

export type NotificationSound = "chime" | "pulse" | "pop" | "none";

export interface NotificationSettings {
  emailNotifications: boolean;
  messageSound: NotificationSound;
  vibration: boolean;
}
