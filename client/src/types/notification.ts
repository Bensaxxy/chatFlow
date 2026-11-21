export type NotificationSound = "chime" | "pulse" | "pop" | "none";

export interface NotificationSettings {
  emailNotifications: boolean;
  messageSound: NotificationSound;
  vibration: boolean;
}
