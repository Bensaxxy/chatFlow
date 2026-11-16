import { z } from "zod";

export const searchUsersSchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Enter a name or email to search")
    .max(60, "Search cannot exceed 60 characters"),

  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
