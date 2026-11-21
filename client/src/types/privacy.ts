export type PrivacyVisibility = "everyone" | "nobody";

export interface PrivacySettings {
  profilePhotoVisibility: PrivacyVisibility;
  lastSeenVisibility: PrivacyVisibility;
  readReceipts: boolean;
}
