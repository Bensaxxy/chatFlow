import { randomUUID } from "node:crypto";

import {
  deleteAvatarFromCloudinary,
  uploadAvatarToCloudinary,
} from "../config/cloudinary";
import { User } from "../models/user.model";
import { AppError } from "../utils/app-error";
import type { UpdateProfileInput } from "../validations/profile.validation";

export const getUserProfile = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User profile was not found", 404, "USER_NOT_FOUND");
  }

  return user;
};

export const updateUserProfile = async (
  userId: string,
  input: UpdateProfileInput,
) => {
  const profileUpdates: UpdateProfileInput = {};

  if (input.name !== undefined) {
    profileUpdates.name = input.name;
  }

  if (input.bio !== undefined) {
    profileUpdates.bio = input.bio;
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: profileUpdates,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedUser) {
    throw new AppError("User profile was not found", 404, "USER_NOT_FOUND");
  }

  return updatedUser;
};

export const updateUserAvatar = async (
  userId: string,
  avatarBuffer: Buffer,
) => {
  const user = await User.findById(userId).select("+avatarPublicId");

  if (!user) {
    throw new AppError("User profile was not found", 404, "USER_NOT_FOUND");
  }

  const previousPublicId = user.avatarPublicId;

  const newPublicId = `user-${userId}-${randomUUID()}`;

  const uploadResult = await uploadAvatarToCloudinary({
    buffer: avatarBuffer,
    publicId: newPublicId,
  });

  try {
    user.avatarUrl = uploadResult.secure_url;

    user.avatarPublicId = uploadResult.public_id;

    await user.save();
  } catch (error) {
    await deleteAvatarFromCloudinary(uploadResult.public_id).catch(
      () => undefined,
    );

    throw error;
  }

  if (previousPublicId && previousPublicId !== uploadResult.public_id) {
    await deleteAvatarFromCloudinary(previousPublicId).catch(
      (error: unknown) => {
        console.error("Could not remove previous profile picture:", error);
      },
    );
  }

  return user;
};

export const removeUserAvatar = async (userId: string) => {
  const user = await User.findById(userId).select("+avatarPublicId");

  if (!user) {
    throw new AppError("User profile was not found", 404, "USER_NOT_FOUND");
  }

  const avatarPublicId = user.avatarPublicId;

  user.avatarUrl = null;
  user.avatarPublicId = null;

  await user.save();

  if (avatarPublicId) {
    await deleteAvatarFromCloudinary(avatarPublicId).catch((error: unknown) => {
      console.error("Could not remove profile picture from Cloudinary:", error);
    });
  }

  return user;
};

export const getPublicUserProfile = async (userId: string) => {
  const user = await User.findById(userId).select(
    "name avatarUrl bio lastSeenAt createdAt updatedAt",
  );

  if (!user) {
    throw new AppError("User profile was not found", 404, "USER_NOT_FOUND");
  }

  return user;
};
