import { randomUUID } from "node:crypto";

import {
  deleteAvatarFromCloudinary,
  uploadAvatarToCloudinary,
} from "../config/cloudinary";
import { User } from "../models/user.model";
import { AppError } from "../utils/app-error";
import type { UpdateProfileInput } from "../validations/profile.validation";
import { getSocketServer } from "../socket/socket.server";
import { Conversation } from "../models/conversation.model";
import { getDirectMessagingAccess } from "./user.service";

interface ProfileUpdatePayload {
  user: {
    _id: string;
    name: string;
    avatarUrl: string | null;
    bio: string;
    updatedAt: string;
  };
}

const emitProfileUpdate = async (
  payload: ProfileUpdatePayload,
): Promise<void> => {
  try {
    const io = getSocketServer();

    const conversations = await Conversation.find({
      participants: payload.user._id,
    })
      .select("participants")
      .lean();

    const recipientIds = new Set<string>([payload.user._id]);

    for (const conversation of conversations) {
      for (const participantId of conversation.participants) {
        recipientIds.add(participantId.toString());
      }
    }

    for (const recipientId of recipientIds) {
      io.to(`user:${recipientId}`).emit("user:profile-updated", payload);
    }
  } catch (error) {
    /*
     * A socket failure must not cause a successful
     * database profile update to fail.
     */
    console.error("Could not emit profile update:", error);
  }
};

const createProfileUpdatePayload = (user: {
  _id: unknown;
  name: string;
  avatarUrl?: string | null;
  bio?: string;
  updatedAt?: Date;
}): ProfileUpdatePayload => ({
  user: {
    _id: String(user._id),
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? "",
    updatedAt: user.updatedAt
      ? new Date(user.updatedAt).toISOString()
      : new Date().toISOString(),
  },
});

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

  await emitProfileUpdate(createProfileUpdatePayload(updatedUser));

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

  await emitProfileUpdate(createProfileUpdatePayload(user));

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

  await emitProfileUpdate(createProfileUpdatePayload(user));

  return user;
};

export const getPublicUserProfile = async (
  userId: string,
  currentUserId: string,
) => {
  const user = await User.findById(userId).select(
    "name avatarUrl bio lastSeenAt createdAt updatedAt",
  );

  if (!user) {
    throw new AppError("User profile was not found", 404, "USER_NOT_FOUND");
  }

  if (currentUserId === userId) {
    return {
      ...user.toJSON(),
      isBlockedByCurrentUser: false,
      canMessage: true,
    };
  }

  const access = await getDirectMessagingAccess(currentUserId, userId);

  return {
    ...user.toJSON(),
    ...access,
  };
};
