import type { RequestHandler } from "express";

import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  discoverFriendCandidates,
  listUserFriendRequests,
  listUserFriends,
  removeFriend,
  sendFriendRequest,
} from "../services/friend.service";
import { asyncHandler } from "../utils/async-handler";
import {
  discoverFriendsQuerySchema,
  friendUserParamsSchema,
  friendshipParamsSchema,
  listFriendRequestsQuerySchema,
  listFriendsQuerySchema,
} from "../validations/friend.validation";

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new Error("Authenticated request is missing its user ID");
  }

  return userId;
};

export const discoverFriends: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const input = discoverFriendsQuerySchema.parse(request.query);

    const result = await discoverFriendCandidates(currentUserId, input);

    response.status(200).json({
      success: true,
      message: "Friend suggestions retrieved successfully",
      data: result,
    });
  },
);

export const listFriends: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const input = listFriendsQuerySchema.parse(request.query);

    const result = await listUserFriends(currentUserId, input);

    response.status(200).json({
      success: true,
      message: "Friends retrieved successfully",
      data: result,
    });
  },
);

export const listFriendRequests: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const input = listFriendRequestsQuerySchema.parse(request.query);

    const result = await listUserFriendRequests(currentUserId, input);

    response.status(200).json({
      success: true,
      message: "Friend requests retrieved successfully",
      data: result,
    });
  },
);

export const createFriendRequest: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { userId } = friendUserParamsSchema.parse(request.params);

    const friendship = await sendFriendRequest(currentUserId, userId);

    response.status(201).json({
      success: true,
      message: "Friend request sent successfully",
      data: {
        friendship,
      },
    });
  },
);

export const acceptRequest: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { friendshipId } = friendshipParamsSchema.parse(request.params);

    const friendship = await acceptFriendRequest(currentUserId, friendshipId);

    response.status(200).json({
      success: true,
      message: "Friend request accepted successfully",
      data: {
        friendship,
      },
    });
  },
);

export const declineRequest: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { friendshipId } = friendshipParamsSchema.parse(request.params);

    await declineFriendRequest(currentUserId, friendshipId);

    response.status(200).json({
      success: true,
      message: "Friend request declined successfully",
    });
  },
);

export const cancelRequest: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { friendshipId } = friendshipParamsSchema.parse(request.params);

    await cancelFriendRequest(currentUserId, friendshipId);

    response.status(200).json({
      success: true,
      message: "Friend request cancelled successfully",
    });
  },
);

export const deleteFriend: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { friendshipId } = friendshipParamsSchema.parse(request.params);

    await removeFriend(currentUserId, friendshipId);

    response.status(200).json({
      success: true,
      message: "Friend removed successfully",
    });
  },
);
