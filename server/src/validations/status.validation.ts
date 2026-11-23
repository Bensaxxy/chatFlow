import { isValidObjectId } from "mongoose";
import { z } from "zod";

import {
  STATUS_AUDIENCES,
  STATUS_BACKGROUNDS,
  STATUS_REACTION_EMOJIS,
} from "../models/status.model";

const objectIdSchema = (message: string) =>
  z.string().refine((value) => isValidObjectId(value), message);

const statusAudienceSchema = z.enum(STATUS_AUDIENCES);

const statusAudienceFields = {
  audience: statusAudienceSchema.default("people_i_chat_with"),

  selectedUserIds: z
    .array(objectIdSchema("A selected user ID is invalid"))
    .max(100, "You can select a maximum of 100 users")
    .default([])
    .transform((values) => [...new Set(values)]),

  excludedUserIds: z
    .array(objectIdSchema("An excluded user ID is invalid"))
    .max(100, "You can exclude a maximum of 100 users")
    .default([])
    .transform((values) => [...new Set(values)]),
};

const validateAudienceSelection = (
  input: {
    audience: (typeof STATUS_AUDIENCES)[number];
    selectedUserIds: string[];
    excludedUserIds: string[];
  },
  context: z.RefinementCtx,
): void => {
  if (
    input.audience === "selected_users" &&
    input.selectedUserIds.length === 0
  ) {
    context.addIssue({
      code: "custom",
      path: ["selectedUserIds"],
      message: "Select at least one person who can view this status",
    });
  }

  if (input.audience === "except_users" && input.excludedUserIds.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["excludedUserIds"],
      message: "Select at least one person to exclude",
    });
  }

  if (input.audience !== "selected_users" && input.selectedUserIds.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["selectedUserIds"],
      message:
        "Selected users can only be used with the selected-users audience",
    });
  }

  if (input.audience !== "except_users" && input.excludedUserIds.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["excludedUserIds"],
      message: "Excluded users can only be used with the except-users audience",
    });
  }
};

export const createTextStatusSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Status text cannot be empty")
      .max(700, "Status text cannot exceed 700 characters"),

    backgroundColor: z.enum(STATUS_BACKGROUNDS).default("cyan"),

    textColor: z.enum(["light", "dark"]).default("light"),

    ...statusAudienceFields,
  })
  .superRefine(validateAudienceSelection);

export const createPhotoStatusSchema = z
  .object({
    caption: z
      .string()
      .trim()
      .max(300, "Status caption cannot exceed 300 characters")
      .default(""),

    ...statusAudienceFields,
  })
  .superRefine(validateAudienceSelection);

export const statusParamsSchema = z.object({
  statusId: objectIdSchema("Status ID is invalid"),
});

export const updateStatusReactionSchema = z.object({
  emoji: z.enum(STATUS_REACTION_EMOJIS).nullable(),
});

export const replyToStatusSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Reply cannot be empty")
    .max(5000, "Reply cannot exceed 5000 characters"),

  clientMessageId: z.string().trim().min(1).max(64).optional(),
});

export type CreateTextStatusInput = z.infer<typeof createTextStatusSchema>;

export type CreatePhotoStatusInput = z.infer<typeof createPhotoStatusSchema>;

export type UpdateStatusReactionInput = z.infer<
  typeof updateStatusReactionSchema
>;

export type ReplyToStatusInput = z.infer<typeof replyToStatusSchema>;
