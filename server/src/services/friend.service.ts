import { Friendship } from "../models/friendship.model";
import { User } from "../models/user.model";
import { getSocketServer } from "../socket/socket.server";
import { AppError } from "../utils/app-error";
import { createViewerSafeUser, getDirectMessagingAccess } from "./user.service";

interface PaginationInput {
  cursor?: string;
  limit: number;
}

export interface DiscoverFriendsInput extends PaginationInput {}

export interface ListFriendsInput extends PaginationInput {}

export interface ListFriendRequestsInput extends PaginationInput {
  direction: "incoming" | "outgoing";
}

interface FriendshipRecord {
  _id: {
    toString(): string;
  };
  users: Array<{
    toString(): string;
  }>;
  requestedBy: {
    toString(): string;
  };
  status: "pending" | "accepted";
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type FriendshipChangedAction =
  | "request_received"
  | "request_accepted"
  | "request_declined"
  | "request_cancelled"
  | "friend_removed";

const publicUserFields =
  "name avatarUrl bio lastSeenAt createdAt privacySettings";

const createPairKey = (firstUserId: string, secondUserId: string): string =>
  [firstUserId, secondUserId].sort().join(":");

const getOtherUserId = (
  friendship: Pick<FriendshipRecord, "users">,
  currentUserId: string,
): string | null => {
  const otherUser = friendship.users.find(
    (userId) => userId.toString() !== currentUserId,
  );

  return otherUser?.toString() ?? null;
};

const isDuplicateKeyError = (
  error: unknown,
): error is {
  code: number;
} =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 11000;

const emitFriendshipChange = (
  recipientUserId: string,
  action: FriendshipChangedAction,
  friendshipId: string,
  otherUserId: string,
): void => {
  getSocketServer().to(`user:${recipientUserId}`).emit("friendship:changed", {
    action,
    friendshipId,
    userId: otherUserId,
  });
};

const getPublicUser = async (
  userId: string,
  viewerId: string,
): Promise<Record<string, unknown>> => {
  const user = await User.findById(userId).select(publicUserFields).lean();

  if (!user) {
    throw new AppError(
      "The selected user was not found",
      404,
      "USER_NOT_FOUND",
    );
  }

  return createViewerSafeUser(user, viewerId);
};

const getFriendshipView = async (
  friendship: FriendshipRecord,
  currentUserId: string,
) => {
  const otherUserId = getOtherUserId(friendship, currentUserId);

  if (!otherUserId) {
    throw new AppError(
      "Friend relationship is invalid",
      500,
      "INVALID_FRIENDSHIP",
    );
  }

  const user = await getPublicUser(otherUserId, currentUserId);

  return {
    friendshipId: friendship._id.toString(),
    status: friendship.status,
    requestedBy: friendship.requestedBy.toString(),
    user,
    acceptedAt: friendship.acceptedAt?.toISOString() ?? null,
    createdAt: friendship.createdAt.toISOString(),
    updatedAt: friendship.updatedAt.toISOString(),
  };
};

const getBlockedAndRelatedUserIds = async (
  currentUserId: string,
): Promise<Set<string>> => {
  const [currentUser, usersBlockingCurrentUser, friendships] =
    await Promise.all([
      User.findById(currentUserId).select("_id +blockedUsers").lean(),

      User.find({
        blockedUsers: currentUserId,
      })
        .select("_id")
        .lean(),

      Friendship.find({
        users: currentUserId,
      })
        .select("users")
        .lean(),
    ]);

  if (!currentUser) {
    throw new AppError("User profile was not found", 404, "USER_NOT_FOUND");
  }

  const excludedUserIds = new Set<string>([currentUserId]);

  for (const blockedUserId of currentUser.blockedUsers ?? []) {
    excludedUserIds.add(blockedUserId.toString());
  }

  for (const user of usersBlockingCurrentUser) {
    excludedUserIds.add(user._id.toString());
  }

  for (const friendship of friendships) {
    for (const userId of friendship.users) {
      excludedUserIds.add(userId.toString());
    }
  }

  return excludedUserIds;
};

export const discoverFriendCandidates = async (
  currentUserId: string,
  input: DiscoverFriendsInput,
) => {
  const excludedUserIds = await getBlockedAndRelatedUserIds(currentUserId);

  const users = await User.find({
    _id: {
      $nin: [...excludedUserIds],
      ...(input.cursor
        ? {
            $lt: input.cursor,
          }
        : {}),
    },

    isEmailVerified: true,
  })
    .select(publicUserFields)
    .sort({
      _id: -1,
    })
    .limit(input.limit + 1)
    .lean();

  const hasMore = users.length > input.limit;
  const visibleUsers = hasMore ? users.slice(0, input.limit) : users;

  return {
    users: visibleUsers.map((user) =>
      createViewerSafeUser(user, currentUserId),
    ),

    hasMore,

    nextCursor: hasMore
      ? (visibleUsers[visibleUsers.length - 1]?._id.toString() ?? null)
      : null,
  };
};

export const listUserFriends = async (
  currentUserId: string,
  input: ListFriendsInput,
) => {
  const friendships = await Friendship.find({
    users: currentUserId,
    status: "accepted",

    ...(input.cursor
      ? {
          _id: {
            $lt: input.cursor,
          },
        }
      : {}),
  })
    .sort({
      _id: -1,
    })
    .limit(input.limit + 1)
    .lean();

  const hasMore = friendships.length > input.limit;

  const visibleFriendships = hasMore
    ? friendships.slice(0, input.limit)
    : friendships;

  const friends = await Promise.all(
    visibleFriendships.map((friendship) =>
      getFriendshipView(friendship as FriendshipRecord, currentUserId),
    ),
  );

  return {
    friends,

    hasMore,

    nextCursor: hasMore
      ? (visibleFriendships[visibleFriendships.length - 1]?._id.toString() ??
        null)
      : null,
  };
};

export const listUserFriendRequests = async (
  currentUserId: string,
  input: ListFriendRequestsInput,
) => {
  const requestFilter =
    input.direction === "incoming"
      ? {
          users: currentUserId,
          requestedBy: {
            $ne: currentUserId,
          },
        }
      : {
          users: currentUserId,
          requestedBy: currentUserId,
        };

  const friendships = await Friendship.find({
    ...requestFilter,
    status: "pending",

    ...(input.cursor
      ? {
          _id: {
            $lt: input.cursor,
          },
        }
      : {}),
  })
    .sort({
      _id: -1,
    })
    .limit(input.limit + 1)
    .lean();

  const hasMore = friendships.length > input.limit;

  const visibleFriendships = hasMore
    ? friendships.slice(0, input.limit)
    : friendships;

  const requests = await Promise.all(
    visibleFriendships.map((friendship) =>
      getFriendshipView(friendship as FriendshipRecord, currentUserId),
    ),
  );

  return {
    requests,

    hasMore,

    nextCursor: hasMore
      ? (visibleFriendships[visibleFriendships.length - 1]?._id.toString() ??
        null)
      : null,
  };
};

export const sendFriendRequest = async (
  currentUserId: string,
  targetUserId: string,
) => {
  if (currentUserId === targetUserId) {
    throw new AppError(
      "You cannot send a friend request to yourself",
      400,
      "SELF_FRIEND_REQUEST_NOT_ALLOWED",
    );
  }

  const targetUser = await User.findOne({
    _id: targetUserId,
    isEmailVerified: true,
  })
    .select("_id")
    .lean();

  if (!targetUser) {
    throw new AppError(
      "The selected user was not found",
      404,
      "USER_NOT_FOUND",
    );
  }

  const messagingAccess = await getDirectMessagingAccess(
    currentUserId,
    targetUserId,
  );

  if (!messagingAccess.canMessage) {
    throw new AppError(
      messagingAccess.isBlockedByCurrentUser
        ? "Unblock this user before sending a friend request"
        : "You cannot send a friend request to this user",
      403,
      "FRIEND_REQUEST_BLOCKED",
    );
  }

  const pairKey = createPairKey(currentUserId, targetUserId);

  const existingFriendship = await Friendship.findOne({
    pairKey,
  });

  if (existingFriendship) {
    if (existingFriendship.status === "accepted") {
      throw new AppError(
        "You are already friends with this user",
        409,
        "ALREADY_FRIENDS",
      );
    }

    if (existingFriendship.requestedBy.toString() === currentUserId) {
      throw new AppError(
        "Friend request has already been sent",
        409,
        "FRIEND_REQUEST_ALREADY_SENT",
      );
    }

    throw new AppError(
      "This user has already sent you a friend request",
      409,
      "INCOMING_FRIEND_REQUEST_EXISTS",
    );
  }

  try {
    const friendship = await Friendship.create({
      users: [currentUserId, targetUserId],
      pairKey,
      requestedBy: currentUserId,
      status: "pending",
    });

    const friendshipView = await getFriendshipView(
      friendship as unknown as FriendshipRecord,
      currentUserId,
    );

    emitFriendshipChange(
      targetUserId,
      "request_received",
      friendship._id.toString(),
      currentUserId,
    );

    return friendshipView;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "A friend relationship already exists with this user",
        409,
        "FRIENDSHIP_ALREADY_EXISTS",
      );
    }

    throw error;
  }
};

export const acceptFriendRequest = async (
  currentUserId: string,
  friendshipId: string,
) => {
  const friendship = await Friendship.findOneAndUpdate(
    {
      _id: friendshipId,
      users: currentUserId,
      requestedBy: {
        $ne: currentUserId,
      },
      status: "pending",
    },
    {
      $set: {
        status: "accepted",
        acceptedAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!friendship) {
    throw new AppError(
      "Incoming friend request was not found",
      404,
      "FRIEND_REQUEST_NOT_FOUND",
    );
  }

  const requesterId = friendship.requestedBy.toString();

  const friendshipView = await getFriendshipView(
    friendship as unknown as FriendshipRecord,
    currentUserId,
  );

  emitFriendshipChange(
    currentUserId,
    "request_accepted",
    friendship._id.toString(),
    requesterId,
  );

  emitFriendshipChange(
    requesterId,
    "request_accepted",
    friendship._id.toString(),
    currentUserId,
  );

  return friendshipView;
};

export const declineFriendRequest = async (
  currentUserId: string,
  friendshipId: string,
): Promise<void> => {
  const friendship = await Friendship.findOneAndDelete({
    _id: friendshipId,
    users: currentUserId,
    requestedBy: {
      $ne: currentUserId,
    },
    status: "pending",
  });

  if (!friendship) {
    throw new AppError(
      "Incoming friend request was not found",
      404,
      "FRIEND_REQUEST_NOT_FOUND",
    );
  }

  const requesterId = friendship.requestedBy.toString();

  emitFriendshipChange(
    currentUserId,
    "request_declined",
    friendship._id.toString(),
    requesterId,
  );

  emitFriendshipChange(
    requesterId,
    "request_declined",
    friendship._id.toString(),
    currentUserId,
  );
};

export const cancelFriendRequest = async (
  currentUserId: string,
  friendshipId: string,
): Promise<void> => {
  const friendship = await Friendship.findOneAndDelete({
    _id: friendshipId,
    users: currentUserId,
    requestedBy: currentUserId,
    status: "pending",
  });

  if (!friendship) {
    throw new AppError(
      "Sent friend request was not found",
      404,
      "FRIEND_REQUEST_NOT_FOUND",
    );
  }

  const targetUserId = getOtherUserId(
    friendship as unknown as FriendshipRecord,
    currentUserId,
  );

  if (targetUserId) {
    emitFriendshipChange(
      currentUserId,
      "request_cancelled",
      friendship._id.toString(),
      targetUserId,
    );

    emitFriendshipChange(
      targetUserId,
      "request_cancelled",
      friendship._id.toString(),
      currentUserId,
    );
  }
};

export const removeFriend = async (
  currentUserId: string,
  friendshipId: string,
): Promise<void> => {
  const friendship = await Friendship.findOneAndDelete({
    _id: friendshipId,
    users: currentUserId,
    status: "accepted",
  });

  if (!friendship) {
    throw new AppError(
      "Friend relationship was not found",
      404,
      "FRIENDSHIP_NOT_FOUND",
    );
  }

  const otherUserId = getOtherUserId(
    friendship as unknown as FriendshipRecord,
    currentUserId,
  );

  if (otherUserId) {
    emitFriendshipChange(
      currentUserId,
      "friend_removed",
      friendship._id.toString(),
      otherUserId,
    );

    emitFriendshipChange(
      otherUserId,
      "friend_removed",
      friendship._id.toString(),
      currentUserId,
    );
  }
};
