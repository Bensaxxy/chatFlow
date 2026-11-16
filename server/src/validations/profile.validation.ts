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
