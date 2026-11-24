import { isValidObjectId } from "mongoose";
import { z } from "zod";

const objectIdSchema = (message: string) =>
  z.string().refine((value) => isValidObjectId(value), message);

export const friendUserParamsSchema = z.object({
  userId: objectIdSchema("User ID is invalid"),
});

export const friendshipParamsSchema = z.object({
  friendshipId: objectIdSchema("Friendship request ID is invalid"),
});

export const discoverFriendsQuerySchema = z.object({
  cursor: objectIdSchema("Discovery cursor is invalid").optional(),

  limit: z.coerce.number().int().min(1).max(30).default(12),
});

export const listFriendsQuerySchema = z.object({
  cursor: objectIdSchema("Friend cursor is invalid").optional(),

  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listFriendRequestsQuerySchema = z.object({
  direction: z.enum(["incoming", "outgoing"]).default("incoming"),

  cursor: objectIdSchema("Friend request cursor is invalid").optional(),

  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type DiscoverFriendsInput = z.infer<typeof discoverFriendsQuerySchema>;

export type ListFriendsInput = z.infer<typeof listFriendsQuerySchema>;

export type ListFriendRequestsInput = z.infer<
  typeof listFriendRequestsQuerySchema
>;
