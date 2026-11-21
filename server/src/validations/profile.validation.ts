import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(60, "Name cannot exceed 60 characters")
      .optional(),

    bio: z
      .string()
      .trim()
      .max(160, "Bio cannot exceed 160 characters")
      .optional(),
  })
  .refine((input) => input.name !== undefined || input.bio !== undefined, {
    message: "Provide at least one profile field to update",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateChatThemeSchema = z.object({
  appearance: z.enum(["light", "dark"]),
  wallpaper: z.enum(["paper", "aurora", "midnight", "blush", "mesh"]),
  bubbleColor: z.enum(["cyan", "violet", "emerald", "rose", "amber"]),
});

export type UpdateChatThemeInput = z.infer<typeof updateChatThemeSchema>;

export const updatePrivacySettingsSchema = z.object({
  profilePhotoVisibility: z.enum(["everyone", "nobody"]),
  lastSeenVisibility: z.enum(["everyone", "nobody"]),
  readReceipts: z.boolean(),
});

export type UpdatePrivacySettingsInput = z.infer<
  typeof updatePrivacySettingsSchema
>;

export const updateNotificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
});

export type UpdateNotificationSettingsInput = z.infer<
  typeof updateNotificationSettingsSchema
>;
