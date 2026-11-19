import { User } from "../models/user.model";
import { AppError } from "../utils/app-error";
import type { SearchUsersInput } from "../validations/user.validation";

const escapeRegularExpression = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export interface DirectMessagingAccess {
  isBlockedByCurrentUser: boolean;
  canMessage: boolean;
}

const getBlockedUserIds = (
  user: { blockedUsers?: Array<{ toString(): string }> } | null,
): Set<string> =>
  new Set(
    (user?.blockedUsers ?? []).map((blockedUserId) => blockedUserId.toString()),
  );

export const getDirectMessagingAccess = async (
  currentUserId: string,
  otherUserId: string,
): Promise<DirectMessagingAccess> => {
  const users = await User.find({
    _id: {
      $in: [currentUserId, otherUserId],
    },
  })
    .select("_id +blockedUsers")
    .lean();

  const currentUser = users.find(
    (user) => user._id.toString() === currentUserId,
  );
  const otherUser = users.find((user) => user._id.toString() === otherUserId);

  if (!otherUser) {
    throw new AppError(
      "The selected user was not found",
      404,
      "USER_NOT_FOUND",
    );
  }

  if (!currentUser) {
    throw new AppError("User profile was not found", 404, "USER_NOT_FOUND");
  }

  const currentUserBlockedIds = getBlockedUserIds(currentUser);
  const otherUserBlockedIds = getBlockedUserIds(otherUser);
  const isBlockedByCurrentUser = currentUserBlockedIds.has(otherUserId);

  return {
    isBlockedByCurrentUser,
    canMessage:
      !isBlockedByCurrentUser && !otherUserBlockedIds.has(currentUserId),
  };
};

export const assertDirectMessagingAllowed = async (
  currentUserId: string,
  otherUserId: string,
): Promise<void> => {
  const access = await getDirectMessagingAccess(currentUserId, otherUserId);

  if (access.canMessage) {
    return;
  }

  throw new AppError(
    access.isBlockedByCurrentUser
      ? "Unblock this user before sending a message"
      : "You cannot send messages to this user",
    403,
    "DIRECT_MESSAGING_BLOCKED",
  );
};

export const blockUser = async (
  currentUserId: string,
  userId: string,
): Promise<DirectMessagingAccess> => {
  if (currentUserId === userId) {
    throw new AppError(
      "You cannot block yourself",
      400,
      "SELF_BLOCK_NOT_ALLOWED",
    );
  }

  const userExists = await User.exists({
    _id: userId,
  });

  if (!userExists) {
    throw new AppError(
      "The selected user was not found",
      404,
      "USER_NOT_FOUND",
    );
  }

  await User.findByIdAndUpdate(currentUserId, {
    $addToSet: {
      blockedUsers: userId,
    },
  });

  return getDirectMessagingAccess(currentUserId, userId);
};

export const unblockUser = async (
  currentUserId: string,
  userId: string,
): Promise<DirectMessagingAccess> => {
  if (currentUserId === userId) {
    throw new AppError(
      "You cannot unblock yourself",
      400,
      "SELF_UNBLOCK_NOT_ALLOWED",
    );
  }

  const userExists = await User.exists({
    _id: userId,
  });

  if (!userExists) {
    throw new AppError(
      "The selected user was not found",
      404,
      "USER_NOT_FOUND",
    );
  }

  await User.findByIdAndUpdate(currentUserId, {
    $pull: {
      blockedUsers: userId,
    },
  });

  return getDirectMessagingAccess(currentUserId, userId);
};

export const searchUsers = async (
  currentUserId: string,
  input: SearchUsersInput,
) => {
  const safeSearch = escapeRegularExpression(input.q);

  const searchExpression = new RegExp(safeSearch, "i");

  const users = await User.find({
    _id: {
      $ne: currentUserId,
    },

    $or: [
      {
        name: searchExpression,
      },
      {
        email: searchExpression,
      },
    ],
  })
    .select("name email avatarUrl bio lastSeenAt createdAt")
    .sort({
      name: 1,
    })
    .limit(input.limit)
    .lean();

  return users;
};
