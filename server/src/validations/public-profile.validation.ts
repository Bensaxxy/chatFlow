import { isValidObjectId } from "mongoose";
import { z } from "zod";

export const publicProfileParamsSchema = z.object({
  userId: z
    .string()
    .refine((value) => isValidObjectId(value), "User ID is invalid"),
});
