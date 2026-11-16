import type { RequestHandler } from "express";

import {
  getPublicUserProfile,
  getUserProfile,
  removeUserAvatar,
  updateUserAvatar,
  updateUserProfile,
} from "../services/profile.service";
import { searchUsers } from "../services/user.service";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import type { UpdateProfileInput } from "../validations/profile.validation";
import { searchUsersSchema } from "../validations/user.validation";
import { publicProfileParamsSchema } from "../validations/public-profile.validation";

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new Error("Authenticated request is missing its user ID");
  }

  return userId;
};

export const search: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const input = searchUsersSchema.parse(request.query);

    const users = await searchUsers(currentUserId, input);

    response.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        users,
      },
    });
  },
);

export const getMyProfile: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const user = await getUserProfile(currentUserId);

    response.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user,
      },
    });
  },
);

export const updateMyProfile: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const input = request.body as UpdateProfileInput;

    const user = await updateUserProfile(currentUserId, input);

    response.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user,
      },
    });
  },
);

export const updateMyAvatar: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    if (!request.file) {
      throw new AppError(
        "Select a profile picture to upload",
        400,
        "AVATAR_REQUIRED",
      );
    }

    const user = await updateUserAvatar(currentUserId, request.file.buffer);

    response.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        user,
      },
    });
  },
);

export const deleteMyAvatar: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const user = await removeUserAvatar(currentUserId);

    response.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      data: {
        user,
      },
    });
  },
);

export const getPublicProfile: RequestHandler = asyncHandler(
  async (request, response) => {
    getAuthenticatedUserId(request.auth?.userId);

    const { userId } = publicProfileParamsSchema.parse(request.params);

    const user = await getPublicUserProfile(userId);

    response.status(200).json({
      success: true,
      message: "Public profile retrieved successfully",
      data: {
        user,
      },
    });
  },
);
