import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { Types } from "mongoose";

import {
  deleteMessageAttachmentFromCloudinary,
  uploadMessageAttachmentToCloudinary,
  type MessageAttachmentResourceType,
} from "../config/cloudinary";
import { Conversation } from "../models/conversation.model";
import { Message } from "../models/message.model";
import { User } from "../models/user.model";
import { getSocketServer } from "../socket/socket.server";
import { AppError } from "../utils/app-error";
import {
  clearMarkedConversationUnread,
  getConversationPreference,
} from "./conversation-preference.service";
import {
  getLinkPreviewPlaceholder,
  resolveLinkPreview,
  type StoredLinkPreview,
} from "./link-preview.service";
import {
  assertDirectMessagingAllowed,
  createViewerSafeUser,
  getPrivacySettings,
} from "./user.service";
import type {
  DeleteMessageInput,
  EditMessageInput,
  ForwardMessageInput,
  ListConversationMediaInput,
  ListMessagesInput,
  SendAttachmentMessageInput,
  SendMessageInput,
  UpdateMessageReactionInput,
} from "../validations/message.validation";

const senderFields = "name email avatarUrl privacySettings";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

const sanitizeMessageForViewer = (
  message: unknown,
  viewerId: string,
  hiddenReadReceiptUserIds = new Set<string>(),
): unknown => {
  const messageRecord = asRecord(message);

  if (!messageRecord) {
    return message;
  }

  const sender = asRecord(messageRecord.sender);
  const replyTo = asRecord(messageRecord.replyTo);
  const replySender = replyTo ? asRecord(replyTo.sender) : null;

  return {
    ...messageRecord,
    sender: sender
      ? createViewerSafeUser(
          sender as unknown as Parameters<typeof createViewerSafeUser>[0],
          viewerId,
        )
      : messageRecord.sender,
    replyTo: replyTo
      ? {
          ...replyTo,
          sender: replySender
            ? createViewerSafeUser(
                replySender as unknown as Parameters<typeof createViewerSafeUser>[0],
                viewerId,
              )
            : replyTo.sender,
        }
      : messageRecord.replyTo,
    readBy: Array.isArray(messageRecord.readBy)
      ? messageRecord.readBy.filter((readerId) => {
          const normalizedReaderId = String(readerId);

          return (
            normalizedReaderId === viewerId ||
            !hiddenReadReceiptUserIds.has(normalizedReaderId)
          );
        })
      : messageRecord.readBy,
  };
};

const sanitizeMessagesForViewer = async (
  messages: unknown[],
  viewerId: string,
): Promise<unknown[]> => {
  const readerIds = new Set<string>();

  for (const message of messages) {
    const readBy = asRecord(message)?.readBy;

    if (!Array.isArray(readBy)) {
      continue;
    }

    for (const readerId of readBy) {
      const normalizedReaderId = String(readerId);

      if (normalizedReaderId !== viewerId) {
        readerIds.add(normalizedReaderId);
      }
    }
  }

  const hiddenReadReceiptUserIds = new Set<string>();

  if (readerIds.size > 0) {
    const usersWithHiddenReadReceipts = await User.find({
      _id: {
        $in: [...readerIds],
      },
      "privacySettings.readReceipts": false,
    })
      .select("_id")
      .lean();

    for (const user of usersWithHiddenReadReceipts) {
      hiddenReadReceiptUserIds.add(user._id.toString());
    }
  }

  return messages.map((message) =>
    sanitizeMessageForViewer(message, viewerId, hiddenReadReceiptUserIds),
  );
};

const replyMessageFields =
  "content type attachment linkPreview sender isForwarded deletedFor " +
  "deletedForEveryoneAt editedAt createdAt";

const messagePopulateOptions = [
  {
    path: "sender",
    select: senderFields,
  },
  {
    path: "replyTo",
    select: replyMessageFields,
    populate: {
      path: "sender",
      select: senderFields,
    },
  },
];

interface StoredMessageAttachment {
  url: string;
  publicId: string;
  resourceType: MessageAttachmentResourceType;
  fileName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
}

interface StoredCloudinaryAttachment {
  publicId: string;
  resourceType: MessageAttachmentResourceType;
}

const escapeRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeFileName = (value: string): string => {
  const normalizedName = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedName.slice(0, 255) || "attachment";
};

const mimeTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".ogv": "video/ogg",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
};

const resolveAttachmentMimeType = (
  mimeType: string,
  fileName: string,
): string => {
  const normalizedMimeType = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";

  if (
    normalizedMimeType &&
    normalizedMimeType !== "application/octet-stream"
  ) {
    return normalizedMimeType;
  }

  return (
    mimeTypeByExtension[extname(fileName).toLowerCase()] ?? normalizedMimeType
  );
};

const deleteUnreferencedAttachment = async (
  attachment: StoredCloudinaryAttachment,
): Promise<void> => {
  /*
   * Forwarded messages deliberately share their source attachment rather
   * than uploading an unnecessary Cloudinary copy. Only free the asset when
   * no visible message still references it.
   */
  const hasActiveReference = await Message.exists({
    "attachment.publicId": attachment.publicId,
    deletedForEveryoneAt: null,
  });

  if (hasActiveReference) {
    return;
  }

  await deleteMessageAttachmentFromCloudinary(
    attachment.publicId,
    attachment.resourceType,
  );
};

const verifyConversationMembership = async (
  conversationId: string,
  userId: string,
) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new AppError(
      "Conversation was not found",
      404,
      "CONVERSATION_NOT_FOUND",
    );
  }

  return conversation;
};

const assertConversationMessagingAllowed = async (
  conversation: {
    type: string;
    participants: Array<{ toString(): string }>;
  },
  currentUserId: string,
): Promise<void> => {
  if (conversation.type !== "direct") {
    return;
  }

  const otherParticipantId = conversation.participants
    .map((participantId) => participantId.toString())
    .find((participantId) => participantId !== currentUserId);

  if (!otherParticipantId) {
    return;
  }

  await assertDirectMessagingAllowed(currentUserId, otherParticipantId);
};

const verifyReplyMessage = async (
  conversationId: string,
  replyToMessageId: string | null | undefined,
  currentUserId: string,
): Promise<void> => {
  if (!replyToMessageId) {
    return;
  }

  const replyMessageExists = await Message.exists({
    _id: replyToMessageId,
    conversation: conversationId,
    deletedForEveryoneAt: null,
    deletedFor: {
      $ne: currentUserId,
    },
  });

  if (!replyMessageExists) {
    throw new AppError(
      "The message you are replying to was not found",
      404,
      "REPLY_MESSAGE_NOT_FOUND",
    );
  }
};

interface CreateRealtimeMessageOptions {
  conversationId: string;
  participantIds: string[];
  senderId: string;
  content: string;
  clientMessageId?: string;
  messageType?: "text" | "image" | "file" | "audio";
  attachment?: StoredMessageAttachment | null;
  linkPreview?: StoredLinkPreview | null;
  replyToMessageId?: string | null;
  isForwarded?: boolean;
  forwardedFromMessageId?: string | null;
}

const isDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === "object" && error !== null && "code" in error && error.code === 11000;

const findExistingClientMessage = async (
  conversationId: string,
  senderId: string,
  clientMessageId: string | undefined,
) => {
  if (!clientMessageId) {
    return null;
  }

  return Message.findOne({
    conversation: conversationId,
    sender: senderId,
    clientMessageId,
  }).populate(messagePopulateOptions);
};

const scheduleLinkPreviewResolution = (
  messageId: string,
  conversationId: string,
  preview: StoredLinkPreview,
): void => {
  void resolveLinkPreview(preview)
    .then(async (resolvedPreview) => {
      /*
       * Only update the exact preview that was queued. If the sender edits
       * their message before the network request returns, the old preview
       * must not overwrite the new one.
       */
      const updatedMessage = await Message.findOneAndUpdate(
        {
          _id: messageId,
          deletedForEveryoneAt: null,
          "linkPreview.url": preview.url,
          "linkPreview.status": "loading",
        },
        {
          $set: {
            linkPreview: resolvedPreview,
          },
        },
        {
          new: true,
        },
      ).populate(messagePopulateOptions);

      if (!updatedMessage) {
        return;
      }

      const conversation = await Conversation.findById(conversationId)
        .select("participants")
        .lean();

      if (!conversation) {
        return;
      }

      const realtimeMessage = updatedMessage.toJSON();
      const io = getSocketServer();

      for (const participantId of conversation.participants) {
        io.to(`user:${participantId.toString()}`).emit("message:updated", {
          conversationId,
          message: sanitizeMessageForViewer(
            realtimeMessage,
            participantId.toString(),
          ),
        });
      }
    })
    .catch((error: unknown) => {
      console.error("Could not resolve link preview:", error);
    });
};

const createRealtimeMessage = async ({
  conversationId,
  participantIds,
  senderId,
  content,
  clientMessageId,
  messageType = "text",
  attachment = null,
  linkPreview: providedLinkPreview,
  replyToMessageId = null,
  isForwarded = false,
  forwardedFromMessageId = null,
}: CreateRealtimeMessageOptions) => {
  const io = getSocketServer();
  const linkPreview =
    providedLinkPreview === undefined
      ? getLinkPreviewPlaceholder(content)
      : providedLinkPreview;

  const existingMessage = await findExistingClientMessage(
    conversationId,
    senderId,
    clientMessageId,
  );

  if (existingMessage) {
    return {
      message: existingMessage,
      created: false,
    };
  }

  const recipientIds = participantIds.filter(
    (participantId) => participantId !== senderId,
  );

  const deliveryResults = await Promise.all(
    recipientIds.map(async (recipientId) => {
      const connectedSockets = await io
        .in(`user:${recipientId}`)
        .fetchSockets();

      return connectedSockets.length > 0 ? recipientId : null;
    }),
  );

  const deliveredRecipientIds = deliveryResults.filter(
    (recipientId): recipientId is string => recipientId !== null,
  );

  let message;

  try {
    message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      type: messageType,
      content,
      clientMessageId: clientMessageId ?? null,
      attachment,
      linkPreview,
      replyTo: replyToMessageId,
      isForwarded,
      forwardedFrom: forwardedFromMessageId,
      deliveredTo: [senderId, ...deliveredRecipientIds],
      readBy: [senderId],
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const duplicateMessage = await findExistingClientMessage(
        conversationId,
        senderId,
        clientMessageId,
      );

      if (duplicateMessage) {
        return {
          message: duplicateMessage,
          created: false,
        };
      }
    }

    throw error;
  }

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      lastMessage: message._id,
    },
  });

  await message.populate(messagePopulateOptions);

  const realtimeMessage = message.toJSON();

  for (const participantId of participantIds) {
    const viewerMessage = sanitizeMessageForViewer(
      realtimeMessage,
      participantId,
    );

    io.to(`user:${participantId}`).emit("message:new", {
      message: viewerMessage,
    });

    io.to(`user:${participantId}`).emit("conversation:updated", {
      conversationId,
      message: viewerMessage,
      updatedAt: message.createdAt.toISOString(),
      incrementUnread: participantId !== senderId,
    });
  }

  if (linkPreview?.status === "loading") {
    scheduleLinkPreviewResolution(
      message._id.toString(),
      conversationId,
      linkPreview,
    );
  }

  return {
    message,
    created: true,
  };
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  input: SendMessageInput,
) => {
  const conversation = await verifyConversationMembership(
    conversationId,
    senderId,
  );

  await assertConversationMessagingAllowed(conversation, senderId);

  await verifyReplyMessage(conversationId, input.replyToMessageId, senderId);

  const result = await createRealtimeMessage({
    conversationId,
    participantIds: conversation.participants.map((participantId) =>
      participantId.toString(),
    ),
    senderId,
    content: input.content,
    clientMessageId: input.clientMessageId,
    replyToMessageId: input.replyToMessageId,
  });

  return result.message;
};

export const sendMessageAttachment = async (
  conversationId: string,
  senderId: string,
  input: SendAttachmentMessageInput,
  file: Express.Multer.File,
) => {
  const conversation = await verifyConversationMembership(
    conversationId,
    senderId,
  );

  await assertConversationMessagingAllowed(conversation, senderId);

  await verifyReplyMessage(conversationId, input.replyToMessageId, senderId);

  const existingMessage = await findExistingClientMessage(
    conversationId,
    senderId,
    input.clientMessageId,
  );

  if (existingMessage) {
    return existingMessage;
  }

  const mimeType = resolveAttachmentMimeType(file.mimetype, file.originalname);

  const isImage = mimeType.startsWith("image/");
  const isAudio = mimeType.startsWith("audio/");
  const isVideo = mimeType.startsWith("video/");

  const resourceType: MessageAttachmentResourceType = isImage
    ? "image"
    : isAudio || isVideo
      ? "video"
      : "raw";

  const messageType: "image" | "file" | "audio" = isImage
    ? "image"
    : isAudio
      ? "audio"
      : "file";

  const originalExtension = extname(file.originalname)
    .toLowerCase()
    .slice(0, 12);

  /**
   * Raw Cloudinary resources retain their extension in the
   * public ID so browsers receive a useful download URL.
   */
  const publicId =
    resourceType === "raw"
      ? `${randomUUID()}${originalExtension}`
      : randomUUID();

  const uploadResult = await uploadMessageAttachmentToCloudinary({
    buffer: file.buffer,
    publicId,
    resourceType,
  });

  const attachment: StoredMessageAttachment = {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    resourceType,
    fileName: sanitizeFileName(file.originalname),
    mimeType,
    size: uploadResult.bytes || file.size,
    width: typeof uploadResult.width === "number" ? uploadResult.width : null,
    height:
      typeof uploadResult.height === "number" ? uploadResult.height : null,
    duration:
      (isAudio || isVideo) && typeof uploadResult.duration === "number"
        ? uploadResult.duration
        : null,
  };

  try {
    const result = await createRealtimeMessage({
      conversationId,
      participantIds: conversation.participants.map((participantId) =>
        participantId.toString(),
      ),
      senderId,
      content: input.content,
      clientMessageId: input.clientMessageId,
      messageType,
      attachment,
      replyToMessageId: input.replyToMessageId,
    });

    if (!result.created) {
      await deleteMessageAttachmentFromCloudinary(
        attachment.publicId,
        attachment.resourceType,
      ).catch((cleanupError: unknown) => {
        console.error(
          "Could not clean up duplicate attachment upload:",
          cleanupError,
        );
      });
    }

    return result.message;
  } catch (error) {
    await deleteMessageAttachmentFromCloudinary(
      attachment.publicId,
      attachment.resourceType,
    ).catch((cleanupError: unknown) => {
      console.error(
        "Could not clean up failed message attachment:",
        cleanupError,
      );
    });

    throw error;
  }
};

export const forwardMessage = async (
  sourceConversationId: string,
  messageId: string,
  currentUserId: string,
  input: ForwardMessageInput,
) => {
  await verifyConversationMembership(sourceConversationId, currentUserId);

  const sourceMessage = await Message.findOne({
    _id: messageId,
    conversation: sourceConversationId,
    deletedForEveryoneAt: null,
    deletedFor: {
      $ne: currentUserId,
    },
  });

  if (!sourceMessage) {
    throw new AppError(
      "The message is unavailable and cannot be forwarded",
      404,
      "MESSAGE_NOT_AVAILABLE",
    );
  }

  const targetConversationIds = [...new Set(input.targetConversationIds)];

  const targetConversations = await Conversation.find({
    _id: {
      $in: targetConversationIds,
    },
    participants: currentUserId,
  });

  if (targetConversations.length !== targetConversationIds.length) {
    throw new AppError(
      "One or more selected conversations were not found",
      404,
      "TARGET_CONVERSATION_NOT_FOUND",
    );
  }

  const conversationsById = new Map(
    targetConversations.map((conversation) => [
      conversation._id.toString(),
      conversation,
    ]),
  );

  await Promise.all(
    targetConversations.map((conversation) =>
      assertConversationMessagingAllowed(conversation, currentUserId),
    ),
  );

  const forwardedMessages = [];

  const forwardedAttachment: StoredMessageAttachment | null =
    sourceMessage.attachment
      ? {
          url: sourceMessage.attachment.url,
          publicId: sourceMessage.attachment.publicId,
          resourceType: sourceMessage.attachment.resourceType,
          fileName: sourceMessage.attachment.fileName,
          mimeType: sourceMessage.attachment.mimeType,
          size: sourceMessage.attachment.size,
          width: sourceMessage.attachment.width ?? null,
          height: sourceMessage.attachment.height ?? null,
          duration: sourceMessage.attachment.duration ?? null,
        }
      : null;

  const forwardedLinkPreview: StoredLinkPreview | null =
    sourceMessage.linkPreview
      ? {
          url: sourceMessage.linkPreview.url,
          domain: sourceMessage.linkPreview.domain,
          title: sourceMessage.linkPreview.title ?? null,
          description: sourceMessage.linkPreview.description ?? null,
          imageUrl: sourceMessage.linkPreview.imageUrl ?? null,
          status: sourceMessage.linkPreview.status,
        }
      : null;

  for (const targetConversationId of targetConversationIds) {
    const targetConversation = conversationsById.get(targetConversationId);

    if (!targetConversation) {
      continue;
    }

    const forwardedMessage = await createRealtimeMessage({
      conversationId: targetConversationId,
      participantIds: targetConversation.participants.map((participantId) =>
        participantId.toString(),
      ),
      senderId: currentUserId,
      content: sourceMessage.content,
      messageType: sourceMessage.type,
      attachment: forwardedAttachment,
      linkPreview: forwardedLinkPreview,
      isForwarded: true,
      forwardedFromMessageId: sourceMessage._id.toString(),
    });

    forwardedMessages.push(forwardedMessage.message);
  }

  return {
    messages: forwardedMessages,
    forwardedCount: forwardedMessages.length,
  };
};

export const getConversationMessages = async (
  conversationId: string,
  currentUserId: string,
  input: ListMessagesInput,
) => {
  await verifyConversationMembership(conversationId, currentUserId);
  const preferences = await getConversationPreference(
    currentUserId,
    conversationId,
  );

  const cursorFilter = input.cursor
    ? {
        _id: {
          $lt: input.cursor,
        },
      }
    : {};

  const searchFilter = input.q
    ? {
        content: {
          $regex: escapeRegularExpression(input.q),
          $options: "i",
        },
        deletedForEveryoneAt: null,
      }
    : {};

  const clearedFilter = preferences.clearedAt
    ? {
        createdAt: {
          $gt: preferences.clearedAt,
        },
      }
    : {};

  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: {
      $ne: currentUserId,
    },
    ...searchFilter,
    ...clearedFilter,
    ...cursorFilter,
  })
    .populate(messagePopulateOptions)
    .sort({
      _id: -1,
    })
    .limit(input.limit + 1)
    .lean();

  const hasMore = messages.length > input.limit;

  if (hasMore) {
    messages.pop();
  }

  const oldestMessage = messages[messages.length - 1];

  const nextCursor =
    hasMore && oldestMessage ? oldestMessage._id.toString() : null;

  messages.reverse();

  return {
    messages: await sanitizeMessagesForViewer(messages, currentUserId),
    nextCursor,
    hasMore,
  };
};

export const getConversationMedia = async (
  conversationId: string,
  currentUserId: string,
  input: ListConversationMediaInput,
) => {
  await verifyConversationMembership(conversationId, currentUserId);
  const preferences = await getConversationPreference(
    currentUserId,
    conversationId,
  );

  const visibleMediaFilter = {
    conversation: conversationId,
    deletedFor: {
      $ne: currentUserId,
    },
    deletedForEveryoneAt: null,
    ...(preferences.clearedAt && {
      createdAt: {
        $gt: preferences.clearedAt,
      },
    }),
    ...(input.cursor && {
      _id: {
        $lt: input.cursor,
      },
    }),
  };

  const mediaQuery = Message.find(visibleMediaFilter);

  switch (input.category) {
    case "images":
      mediaQuery.or([
        { type: "image" },
        { "attachment.resourceType": "image" },
        { "attachment.mimeType": /^image\//i },
      ]);
      break;
    case "videos":
      mediaQuery.or([
        { "attachment.mimeType": /^video\//i },
      ]);
      break;
    case "voice-notes":
      mediaQuery.or([
        { type: "audio" },
        { "attachment.mimeType": /^audio\//i },
      ]);
      break;
    case "links":
      mediaQuery.where("linkPreview.url").exists(true).ne(null);
      break;
    case "files":
      mediaQuery.and([
        { "attachment.url": { $exists: true } },
        { type: { $nin: ["image", "audio"] } },
        { "attachment.mimeType": { $not: /^video\//i } },
        { "attachment.mimeType": { $not: /^audio\//i } },
      ]);
      break;
  }

  const messages = await mediaQuery
    .populate(messagePopulateOptions)
    .sort({
      _id: -1,
    })
    .limit(input.limit + 1)
    .lean();

  const hasMore = messages.length > input.limit;

  if (hasMore) {
    messages.pop();
  }

  const oldestMessage = messages[messages.length - 1];

  return {
    messages: await sanitizeMessagesForViewer(messages, currentUserId),
    nextCursor:
      hasMore && oldestMessage ? oldestMessage._id.toString() : null,
    hasMore,
  };
};

export const getMessageContext = async (
  conversationId: string,
  messageId: string,
  currentUserId: string,
) => {
  await verifyConversationMembership(conversationId, currentUserId);
  const preferences = await getConversationPreference(
    currentUserId,
    conversationId,
  );

  const visibleMessageFilter = {
    conversation: conversationId,
    deletedFor: {
      $ne: currentUserId,
    },
    deletedForEveryoneAt: null,
    ...(preferences.clearedAt && {
      createdAt: {
        $gt: preferences.clearedAt,
      },
    }),
  };

  const targetMessage = await Message.findOne({
    _id: messageId,
    ...visibleMessageFilter,
  })
    .populate(messagePopulateOptions)
    .lean();

  if (!targetMessage) {
    throw new AppError("Message was not found", 404, "MESSAGE_NOT_FOUND");
  }

  const [messagesBefore, messagesAfter] = await Promise.all([
    Message.find({
      ...visibleMessageFilter,
      _id: {
        $lt: targetMessage._id,
      },
    })
      .populate(messagePopulateOptions)
      .sort({
        _id: -1,
      })
      .limit(15)
      .lean(),

    Message.find({
      ...visibleMessageFilter,
      _id: {
        $gt: targetMessage._id,
      },
    })
      .populate(messagePopulateOptions)
      .sort({
        _id: 1,
      })
      .limit(15)
      .lean(),
  ]);

  messagesBefore.reverse();

  return {
    messages: await sanitizeMessagesForViewer(
      [...messagesBefore, targetMessage, ...messagesAfter],
      currentUserId,
    ),
  };
};

export const markConversationAsRead = async (
  conversationId: string,
  currentUserId: string,
) => {
  await verifyConversationMembership(conversationId, currentUserId);

  const [result] = await Promise.all([
    Message.updateMany(
      {
        conversation: conversationId,
        sender: {
          $ne: currentUserId,
        },
        readBy: {
          $ne: currentUserId,
        },
      },
      {
        $addToSet: {
          readBy: currentUserId,
          deliveredTo: currentUserId,
        },
      },
    ),
    clearMarkedConversationUnread(currentUserId, conversationId),
  ]);

  const readAt = new Date().toISOString();
  const reader = await User.findById(currentUserId)
    .select("privacySettings")
    .lean();

  if (reader) {
    const io = getSocketServer();
    const payload = {
      conversationId,
      userId: currentUserId,
      readAt,
    };

    if (getPrivacySettings(reader.privacySettings).readReceipts) {
      io.to(`conversation:${conversationId}`)
        .to(`user:${currentUserId}`)
        .emit("conversation:read", payload);
    } else {
      io.to(`user:${currentUserId}`).emit("conversation:read", payload);
    }
  }

  return {
    markedCount: result.modifiedCount,
    readAt,
  };
};

export const deleteMessage = async (
  conversationId: string,
  messageId: string,
  currentUserId: string,
  input: DeleteMessageInput,
) => {
  const conversation = await verifyConversationMembership(
    conversationId,
    currentUserId,
  );

  const message = await Message.findOne({
    _id: messageId,
    conversation: conversationId,
  });

  if (!message) {
    throw new AppError("Message was not found", 404, "MESSAGE_NOT_FOUND");
  }

  const io = getSocketServer();

  if (input.scope === "me") {
    await Message.updateOne(
      {
        _id: messageId,
        conversation: conversationId,
      },
      {
        $addToSet: {
          deletedFor: currentUserId,
        },
      },
    );

    const payload = {
      conversationId,
      messageId,
      deletedByUserId: currentUserId,
      scope: "me" as const,
      deletedForEveryoneAt: null,
    };

    io.to(`user:${currentUserId}`).emit("message:deleted", payload);

    return payload;
  }

  if (message.sender.toString() !== currentUserId) {
    throw new AppError(
      "Only the sender can delete this message for everyone",
      403,
      "MESSAGE_DELETE_FORBIDDEN",
    );
  }

  const deletedAt = message.deletedForEveryoneAt ?? new Date();
  const attachmentToDelete = message.attachment
    ? {
        publicId: message.attachment.publicId,
        resourceType: message.attachment.resourceType,
      }
    : null;

  message.deletedForEveryoneAt = deletedAt;
  message.content = "This message was deleted";
  message.type = "text";
  message.attachment = null;
  message.linkPreview = null;

  await message.save();

  if (attachmentToDelete) {
    await deleteUnreferencedAttachment(attachmentToDelete).catch(
      (cleanupError: unknown) => {
        console.error(
          "Could not remove deleted message attachment from Cloudinary:",
          cleanupError,
        );
      },
    );
  }

  const payload = {
    conversationId,
    messageId,
    deletedByUserId: currentUserId,
    scope: "everyone" as const,
    deletedForEveryoneAt: deletedAt.toISOString(),
  };

  for (const participantId of conversation.participants) {
    io.to(`user:${participantId.toString()}`).emit("message:deleted", payload);
  }

  return payload;
};

export const editMessage = async (
  conversationId: string,
  messageId: string,
  currentUserId: string,
  input: EditMessageInput,
) => {
  const conversation = await verifyConversationMembership(
    conversationId,
    currentUserId,
  );

  await assertConversationMessagingAllowed(conversation, currentUserId);

  const message = await Message.findOne({
    _id: messageId,
    conversation: conversationId,
  });

  if (!message) {
    throw new AppError("Message was not found", 404, "MESSAGE_NOT_FOUND");
  }

  if (message.sender.toString() !== currentUserId) {
    throw new AppError(
      "You can only edit messages that you sent",
      403,
      "MESSAGE_EDIT_FORBIDDEN",
    );
  }

  if (message.deletedForEveryoneAt) {
    throw new AppError(
      "A deleted message cannot be edited",
      400,
      "MESSAGE_ALREADY_DELETED",
    );
  }

  message.content = input.content;
  message.editedAt = new Date();
  message.linkPreview = getLinkPreviewPlaceholder(input.content);

  await message.save();
  await message.populate(messagePopulateOptions);

  const realtimeMessage = message.toJSON();
  const io = getSocketServer();

  for (const participantId of conversation.participants) {
    io.to(`user:${participantId.toString()}`).emit("message:updated", {
      conversationId,
      message: sanitizeMessageForViewer(realtimeMessage, participantId.toString()),
    });
  }

  if (message.linkPreview?.status === "loading") {
    scheduleLinkPreviewResolution(
      message._id.toString(),
      conversationId,
      {
        url: message.linkPreview.url,
        domain: message.linkPreview.domain,
        title: message.linkPreview.title ?? null,
        description: message.linkPreview.description ?? null,
        imageUrl: message.linkPreview.imageUrl ?? null,
        status: message.linkPreview.status,
      },
    );
  }

  return message;
};

export const updateMessageReaction = async (
  conversationId: string,
  messageId: string,
  currentUserId: string,
  input: UpdateMessageReactionInput,
) => {
  const conversation = await verifyConversationMembership(
    conversationId,
    currentUserId,
  );

  await assertConversationMessagingAllowed(conversation, currentUserId);

  const message = await Message.findOne({
    _id: messageId,
    conversation: conversationId,
  });

  if (!message) {
    throw new AppError("Message was not found", 404, "MESSAGE_NOT_FOUND");
  }

  if (message.deletedForEveryoneAt) {
    throw new AppError(
      "You cannot react to a deleted message",
      400,
      "MESSAGE_ALREADY_DELETED",
    );
  }

  const isDeletedForCurrentUser = message.deletedFor.some(
    (userId) => userId.toString() === currentUserId,
  );

  if (isDeletedForCurrentUser) {
    throw new AppError(
      "You cannot react to a message deleted for you",
      400,
      "MESSAGE_DELETED_FOR_USER",
    );
  }

  for (let index = message.reactions.length - 1; index >= 0; index -= 1) {
    const reaction = message.reactions[index];

    if (reaction?.user.toString() === currentUserId) {
      message.reactions.splice(index, 1);
    }
  }

  if (input.emoji) {
    message.reactions.push({
      emoji: input.emoji,
      user: new Types.ObjectId(currentUserId),
      reactedAt: new Date(),
    });
  }

  await message.save();
  await message.populate(messagePopulateOptions);

  const realtimeMessage = message.toJSON();
  const io = getSocketServer();

  for (const participantId of conversation.participants) {
    io.to(`user:${participantId.toString()}`).emit("message:updated", {
      conversationId,
      message: sanitizeMessageForViewer(realtimeMessage, participantId.toString()),
    });
  }

  return message;
};
