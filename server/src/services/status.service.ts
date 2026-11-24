import { randomUUID } from "node:crypto";

import { Types } from "mongoose";

import {
  deleteStatusPhotoFromCloudinary,
  uploadStatusPhotoToCloudinary,
} from "../config/cloudinary";
import { Conversation } from "../models/conversation.model";
import { Status } from "../models/status.model";
import { User } from "../models/user.model";
import { getSocketServer } from "../socket/socket.server";
import { AppError } from "../utils/app-error";
import type {
  CreatePhotoStatusInput,
  CreateTextStatusInput,
  UpdateStatusReactionInput,
} from "../validations/status.validation";
import { createViewerSafeUser } from "./user.service";

const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;

type StatusPhotoMimeType = "image/jpeg" | "image/png" | "image/webp";

const getStatusPhotoMimeType = (mimeType: string): StatusPhotoMimeType => {
  switch (mimeType) {
    case "image/jpeg":
    case "image/png":
    case "image/webp":
      return mimeType;

    default:
      throw new AppError(
        "Status photos must be JPEG, PNG, or WebP images",
        400,
        "INVALID_STATUS_PHOTO_TYPE",
      );
  }
};

const statusAuthorFields =
  "name email avatarUrl bio privacySettings lastSeenAt";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

const asPlainRecord = (value: unknown): Record<string, unknown> | null => {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const toObject = record.toObject;

  if (typeof toObject !== "function") {
    return record;
  }

  return asRecord(toObject.call(value)) ?? record;
};

const normalizeId = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  const record = asRecord(value);

  if (record?._id) {
    return String(record._id);
  }

  return String(value);
};

const normalizeIdArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeId);
};

const getEntityId = (value: unknown): string => {
  const record = asRecord(value);

  if (record?._id) {
    return normalizeId(record._id);
  }

  return normalizeId(value);
};

const getPeopleUserHasChattedWith = async (
  userId: string,
): Promise<Set<string>> => {
  const conversations = await Conversation.find({
    participants: userId,
  })
    .select("participants")
    .lean();

  const participantIds = new Set<string>();

  for (const conversation of conversations) {
    for (const participantId of conversation.participants) {
      const normalizedParticipantId = participantId.toString();

      if (normalizedParticipantId !== userId) {
        participantIds.add(normalizedParticipantId);
      }
    }
  }

  return participantIds;
};

const getMutuallyBlockedUserIds = async (
  userId: string,
): Promise<Set<string>> => {
  const [currentUser, usersBlockingCurrentUser] = await Promise.all([
    User.findById(userId).select("+blockedUsers").lean(),

    User.find({
      blockedUsers: userId,
    })
      .select("_id")
      .lean(),
  ]);

  if (!currentUser) {
    throw new AppError(
      "Authenticated user was not found",
      401,
      "USER_NOT_FOUND",
    );
  }

  const currentUserRecord = asRecord(currentUser);

  const blockedUserIds = new Set<string>(
    normalizeIdArray(currentUserRecord?.blockedUsers),
  );

  for (const blockingUser of usersBlockingCurrentUser) {
    blockedUserIds.add(blockingUser._id.toString());
  }

  blockedUserIds.delete(userId);

  return blockedUserIds;
};

const validateAudienceUsers = async (
  authorId: string,
  selectedUserIds: string[],
  excludedUserIds: string[],
): Promise<{
  selectedUserIds: string[];
  excludedUserIds: string[];
}> => {
  const normalizedSelectedUserIds = [
    ...new Set(
      selectedUserIds.filter((selectedUserId) => selectedUserId !== authorId),
    ),
  ];

  const normalizedExcludedUserIds = [
    ...new Set(
      excludedUserIds.filter((excludedUserId) => excludedUserId !== authorId),
    ),
  ];

  const referencedUserIds = [
    ...new Set([...normalizedSelectedUserIds, ...normalizedExcludedUserIds]),
  ];

  if (referencedUserIds.length > 0) {
    const existingUserCount = await User.countDocuments({
      _id: {
        $in: referencedUserIds,
      },
    });

    if (existingUserCount !== referencedUserIds.length) {
      throw new AppError(
        "One or more selected status viewers were not found",
        400,
        "STATUS_AUDIENCE_USER_NOT_FOUND",
      );
    }
  }

  return {
    selectedUserIds: normalizedSelectedUserIds,
    excludedUserIds: normalizedExcludedUserIds,
  };
};

const statusIsVisibleToUser = async (
  statusRecord: Record<string, unknown>,
  viewerId: string,
): Promise<boolean> => {
  const authorId = getEntityId(statusRecord.author);

  if (authorId === viewerId) {
    return true;
  }

  const blockedUserIds = await getMutuallyBlockedUserIds(viewerId);

  if (blockedUserIds.has(authorId)) {
    return false;
  }

  const audience = statusRecord.audience;

  if (audience === "everyone") {
    return true;
  }

  if (audience === "selected_users") {
    return normalizeIdArray(statusRecord.selectedUsers).includes(viewerId);
  }

  if (audience === "except_users") {
    return !normalizeIdArray(statusRecord.excludedUsers).includes(viewerId);
  }

  if (audience === "people_i_chat_with") {
    const sharedConversation = await Conversation.exists({
      participants: {
        $all: [authorId, viewerId],
      },
    });

    return sharedConversation !== null;
  }

  return false;
};

const serializeStatusForViewer = (
  status: {
    toJSON: () => unknown;
  },
  viewerId: string,
): Record<string, unknown> => {
  const rawStatus = asRecord(status.toJSON());

  if (!rawStatus) {
    return {};
  }

  const viewers = Array.isArray(rawStatus.viewers) ? rawStatus.viewers : [];

  const reactions = Array.isArray(rawStatus.reactions)
    ? rawStatus.reactions
    : [];

  const viewerHasViewed = viewers.some((viewer) => {
    const viewerRecord = asRecord(viewer);

    return getEntityId(viewerRecord?.user) === viewerId;
  });

  const viewerReaction = reactions.find((reaction) => {
    const reactionRecord = asRecord(reaction);

    return getEntityId(reactionRecord?.user) === viewerId;
  });

  const viewerReactionRecord = asRecord(viewerReaction);
  const authorRecord = asRecord(rawStatus.author);
  const reactionCounts = new Map<string, number>();

  for (const reaction of reactions) {
    const emoji = asRecord(reaction)?.emoji;

    if (typeof emoji !== "string") {
      continue;
    }

    reactionCounts.set(emoji, (reactionCounts.get(emoji) ?? 0) + 1);
  }

  const serializedStatus: Record<string, unknown> = {
    ...rawStatus,

    author: authorRecord
      ? createViewerSafeUser(
          authorRecord as unknown as Parameters<typeof createViewerSafeUser>[0],
          viewerId,
        )
      : rawStatus.author,

    viewCount: viewers.length,
    reactionCount: reactions.length,
    reactionSummary: [...reactionCounts].map(([emoji, count]) => ({
      emoji,
      count,
    })),
    viewerHasViewed,
    viewerReaction:
      typeof viewerReactionRecord?.emoji === "string"
        ? viewerReactionRecord.emoji
        : null,
  };

  delete serializedStatus.viewers;
  delete serializedStatus.reactions;
  delete serializedStatus.selectedUsers;
  delete serializedStatus.excludedUsers;

  return serializedStatus;
};

const findAccessibleStatus = async (statusId: string, viewerId: string) => {
  const status = await Status.findOne({
    _id: statusId,
    expiresAt: {
      $gt: new Date(),
    },
  }).populate("author", statusAuthorFields);

  if (!status) {
    throw new AppError(
      "Status was not found or has expired",
      404,
      "STATUS_NOT_FOUND",
    );
  }

  const statusRecord = asRecord(status.toObject());

  if (!statusRecord || !(await statusIsVisibleToUser(statusRecord, viewerId))) {
    throw new AppError(
      "Status was not found or is not available to you",
      404,
      "STATUS_NOT_FOUND",
    );
  }

  return status;
};

const getStatusRecipientIds = async (status: {
  author: unknown;
  audience: unknown;
  selectedUsers: unknown;
  excludedUsers: unknown;
}): Promise<string[]> => {
  const authorId = getEntityId(status.author);
  const audience = String(status.audience);

  let recipientIds = new Set<string>();

  if (audience === "everyone" || audience === "except_users") {
    const users = await User.find({}).select("_id").lean();

    recipientIds = new Set(users.map((user) => user._id.toString()));
  }

  if (audience === "people_i_chat_with") {
    recipientIds = await getPeopleUserHasChattedWith(authorId);
  }

  if (audience === "selected_users") {
    recipientIds = new Set(normalizeIdArray(status.selectedUsers));
  }

  if (audience === "except_users") {
    for (const excludedUserId of normalizeIdArray(status.excludedUsers)) {
      recipientIds.delete(excludedUserId);
    }
  }

  const blockedUserIds = await getMutuallyBlockedUserIds(authorId);

  for (const blockedUserId of blockedUserIds) {
    recipientIds.delete(blockedUserId);
  }

  recipientIds.add(authorId);

  return [...recipientIds];
};

const emitStatusCreated = async (status: {
  _id: unknown;
  author: unknown;
  audience: unknown;
  selectedUsers: unknown;
  excludedUsers: unknown;
}): Promise<void> => {
  const io = getSocketServer();
  const statusId = normalizeId(status._id);
  const authorId = getEntityId(status.author);

  const recipientIds = await getStatusRecipientIds(status);

  for (const recipientId of recipientIds) {
    io.to(`user:${recipientId}`).emit("status:new", {
      statusId,
      authorId,
    });
  }
};

const emitStatusDeleted = async (status: {
  _id: unknown;
  author: unknown;
  audience: unknown;
  selectedUsers: unknown;
  excludedUsers: unknown;
}): Promise<void> => {
  const io = getSocketServer();
  const statusId = normalizeId(status._id);
  const authorId = getEntityId(status.author);

  const recipientIds = await getStatusRecipientIds(status);

  for (const recipientId of recipientIds) {
    io.to(`user:${recipientId}`).emit("status:deleted", {
      statusId,
      authorId,
    });
  }
};

export const createTextStatus = async (
  authorId: string,
  input: CreateTextStatusInput,
) => {
  const audienceUsers = await validateAudienceUsers(
    authorId,
    input.selectedUserIds,
    input.excludedUserIds,
  );

  const status = await Status.create({
    author: authorId,
    type: "text",
    text: input.text,
    photo: null,
    backgroundColor: input.backgroundColor,
    textColor: input.textColor,
    audience: input.audience,
    selectedUsers: audienceUsers.selectedUserIds,
    excludedUsers: audienceUsers.excludedUserIds,
    expiresAt: new Date(Date.now() + STATUS_LIFETIME_MS),
  });

  await status.populate("author", statusAuthorFields);

  await emitStatusCreated(status);

  return serializeStatusForViewer(status, authorId);
};

export const createPhotoStatus = async (
  authorId: string,
  input: CreatePhotoStatusInput,
  photoFile: Express.Multer.File,
) => {
  const audienceUsers = await validateAudienceUsers(
    authorId,
    input.selectedUserIds,
    input.excludedUserIds,
  );

  const photoMimeType = getStatusPhotoMimeType(photoFile.mimetype);

  const publicId = `status-${authorId}-${randomUUID()}`;

  const uploadResult = await uploadStatusPhotoToCloudinary({
    buffer: photoFile.buffer,
    publicId,
  });

  try {
    const status = await Status.create({
      author: authorId,
      type: "photo",
      text: input.caption,

      photo: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,

        width:
          typeof uploadResult.width === "number" ? uploadResult.width : null,

        height:
          typeof uploadResult.height === "number" ? uploadResult.height : null,

        mimeType: photoMimeType,
        size: photoFile.size,
      },

      backgroundColor: "slate",
      textColor: "light",
      audience: input.audience,
      selectedUsers: audienceUsers.selectedUserIds,
      excludedUsers: audienceUsers.excludedUserIds,
      expiresAt: new Date(Date.now() + STATUS_LIFETIME_MS),
    });

    await status.populate("author", statusAuthorFields);

    await emitStatusCreated(status);

    return serializeStatusForViewer(status, authorId);
  } catch (error) {
    await deleteStatusPhotoFromCloudinary(uploadResult.public_id).catch(
      () => undefined,
    );

    throw error;
  }
};

export const getStatusFeed = async (viewerId: string) => {
  const [blockedUserIds, chatParticipantIds] = await Promise.all([
    getMutuallyBlockedUserIds(viewerId),
    getPeopleUserHasChattedWith(viewerId),
  ]);

  const statuses = await Status.find({
    expiresAt: {
      $gt: new Date(),
    },

    author: {
      $nin: [...blockedUserIds],
    },

    $or: [
      {
        author: viewerId,
      },
      {
        audience: "everyone",
      },
      {
        audience: "people_i_chat_with",
        author: {
          $in: [...chatParticipantIds],
        },
      },
      {
        audience: "selected_users",
        selectedUsers: viewerId,
      },
      {
        audience: "except_users",
        excludedUsers: {
          $ne: viewerId,
        },
      },
    ],
  })
    .populate("author", statusAuthorFields)
    .sort({
      createdAt: 1,
    });

  return statuses.map((status) => serializeStatusForViewer(status, viewerId));
};

export const getStatusForViewer = async (
  statusId: string,
  viewerId: string,
) => {
  const status = await findAccessibleStatus(statusId, viewerId);

  return serializeStatusForViewer(status, viewerId);
};

export const markStatusViewed = async (statusId: string, viewerId: string) => {
  const accessibleStatus = await findAccessibleStatus(statusId, viewerId);

  const authorId = getEntityId(accessibleStatus.author);

  if (authorId === viewerId) {
    return serializeStatusForViewer(accessibleStatus, viewerId);
  }

  const viewedAt = new Date();

  const updatedStatus = await Status.findOneAndUpdate(
    {
      _id: statusId,
      expiresAt: {
        $gt: new Date(),
      },
      "viewers.user": {
        $ne: viewerId,
      },
    },
    {
      $push: {
        viewers: {
          user: viewerId,
          viewedAt,
        },
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).populate("author", statusAuthorFields);

  if (!updatedStatus) {
    return serializeStatusForViewer(accessibleStatus, viewerId);
  }

  const io = getSocketServer();

  io.to(`user:${authorId}`).emit("status:viewed", {
    statusId,
    viewerId,
    viewedAt: viewedAt.toISOString(),
  });

  return serializeStatusForViewer(updatedStatus, viewerId);
};

export const updateStatusReaction = async (
  statusId: string,
  userId: string,
  input: UpdateStatusReactionInput,
) => {
  const accessibleStatus = await findAccessibleStatus(statusId, userId);

  await Status.updateOne(
    {
      _id: statusId,
    },
    {
      $pull: {
        reactions: {
          user: userId,
        },
      },
    },
  );

  const reactedAt = new Date();

  if (input.emoji) {
    await Status.updateOne(
      {
        _id: statusId,
        expiresAt: {
          $gt: new Date(),
        },
      },
      {
        $push: {
          reactions: {
            user: userId,
            emoji: input.emoji,
            reactedAt,
          },
        },
      },
      {
        runValidators: true,
      },
    );
  }

  const updatedStatus = await Status.findById(statusId).populate(
    "author",
    statusAuthorFields,
  );

  if (!updatedStatus) {
    throw new AppError("Status was not found", 404, "STATUS_NOT_FOUND");
  }

  const authorId = getEntityId(accessibleStatus.author);
  const io = getSocketServer();

  io.to(`user:${authorId}`).emit("status:reaction", {
    statusId,
    userId,
    emoji: input.emoji,
    reactedAt: reactedAt.toISOString(),
  });

  return serializeStatusForViewer(updatedStatus, userId);
};

export const getStatusViewers = async (statusId: string, ownerId: string) => {
  const status = await Status.findOne({
    _id: statusId,
    author: ownerId,
  }).populate({
    path: "viewers.user",
    select: statusAuthorFields,
  });

  if (!status) {
    throw new AppError("Status was not found", 404, "STATUS_NOT_FOUND");
  }

  const reactionByUserId = new Map(
    status.reactions.map((reaction) => [
      getEntityId(reaction.user),
      reaction.emoji,
    ]),
  );

  return status.viewers
    .map((viewer) => {
      const viewerRecord = asPlainRecord(viewer.user);

      if (!viewerRecord) {
        return null;
      }

      return {
        user: createViewerSafeUser(
          viewerRecord as unknown as Parameters<typeof createViewerSafeUser>[0],
          ownerId,
        ),
        viewedAt: viewer.viewedAt.toISOString(),
        reaction: reactionByUserId.get(getEntityId(viewer.user)) ?? null,
      };
    })
    .filter((viewer): viewer is NonNullable<typeof viewer> => viewer !== null)
    .sort(
      (firstViewer, secondViewer) =>
        new Date(secondViewer.viewedAt).getTime() -
        new Date(firstViewer.viewedAt).getTime(),
    );
};

export const deleteStatus = async (
  statusId: string,
  ownerId: string,
): Promise<void> => {
  const status = await Status.findOne({
    _id: statusId,
    author: ownerId,
  }).select("+photo.publicId");

  if (!status) {
    throw new AppError("Status was not found", 404, "STATUS_NOT_FOUND");
  }

  const eventStatus = {
    _id: status._id,
    author: status.author,
    audience: status.audience,
    selectedUsers: status.selectedUsers,
    excludedUsers: status.excludedUsers,
  };

  const photoPublicId = status.get("photo.publicId") as
    | string
    | null
    | undefined;

  if (photoPublicId) {
    await deleteStatusPhotoFromCloudinary(photoPublicId);
  }

  await Status.deleteOne({
    _id: status._id,
  });

  await emitStatusDeleted(eventStatus);
};
