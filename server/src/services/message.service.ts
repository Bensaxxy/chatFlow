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
import { getSocketServer } from "../socket/socket.server";
import { AppError } from "../utils/app-error";
import type {
  DeleteMessageInput,
  EditMessageInput,
  ForwardMessageInput,
  ListMessagesInput,
  SendAttachmentMessageInput,
  SendMessageInput,
  UpdateMessageReactionInput,
} from "../validations/message.validation";

const senderFields = "name email avatarUrl";

const replyMessageFields =
  "content type attachment sender isForwarded deletedFor " +
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
  if (mimeType && mimeType !== "application/octet-stream") {
    return mimeType;
  }

  return mimeTypeByExtension[extname(fileName).toLowerCase()] ?? mimeType;
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
  messageType?: "text" | "image" | "file";
  attachment?: StoredMessageAttachment | null;
  replyToMessageId?: string | null;
  isForwarded?: boolean;
  forwardedFromMessageId?: string | null;
}

const createRealtimeMessage = async ({
  conversationId,
  participantIds,
  senderId,
  content,
  messageType = "text",
  attachment = null,
  replyToMessageId = null,
  isForwarded = false,
  forwardedFromMessageId = null,
}: CreateRealtimeMessageOptions) => {
  const io = getSocketServer();

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

  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    type: messageType,
    content,
    attachment,
    replyTo: replyToMessageId,
    isForwarded,
    forwardedFrom: forwardedFromMessageId,
    deliveredTo: [senderId, ...deliveredRecipientIds],
    readBy: [senderId],
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      lastMessage: message._id,
    },
  });

  await message.populate(messagePopulateOptions);

  const realtimeMessage = message.toJSON();

  io.to(`conversation:${conversationId}`).emit("message:new", {
    message: realtimeMessage,
  });

  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit("conversation:updated", {
      conversationId,
      message: realtimeMessage,
      updatedAt: message.createdAt.toISOString(),
      incrementUnread: participantId !== senderId,
    });
  }

  return message;
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

  await verifyReplyMessage(conversationId, input.replyToMessageId, senderId);

  return createRealtimeMessage({
    conversationId,
    participantIds: conversation.participants.map((participantId) =>
      participantId.toString(),
    ),
    senderId,
    content: input.content,
    replyToMessageId: input.replyToMessageId,
  });
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

  await verifyReplyMessage(conversationId, input.replyToMessageId, senderId);

  const mimeType = resolveAttachmentMimeType(file.mimetype, file.originalname);

  const isImage = mimeType.startsWith("image/");

  const resourceType: MessageAttachmentResourceType = isImage ? "image" : "raw";

  const messageType: "image" | "file" = isImage ? "image" : "file";

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
  };

  try {
    return await createRealtimeMessage({
      conversationId,
      participantIds: conversation.participants.map((participantId) =>
        participantId.toString(),
      ),
      senderId,
      content: input.content,
      messageType,
      attachment,
      replyToMessageId: input.replyToMessageId,
    });
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
      isForwarded: true,
      forwardedFromMessageId: sourceMessage._id.toString(),
    });

    forwardedMessages.push(forwardedMessage);
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

  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: {
      $ne: currentUserId,
    },
    ...searchFilter,
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
    messages,
    nextCursor,
    hasMore,
  };
};

export const getMessageContext = async (
  conversationId: string,
  messageId: string,
  currentUserId: string,
) => {
  await verifyConversationMembership(conversationId, currentUserId);

  const visibleMessageFilter = {
    conversation: conversationId,
    deletedFor: {
      $ne: currentUserId,
    },
    deletedForEveryoneAt: null,
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
    messages: [...messagesBefore, targetMessage, ...messagesAfter],
  };
};

export const markConversationAsRead = async (
  conversationId: string,
  currentUserId: string,
) => {
  await verifyConversationMembership(conversationId, currentUserId);

  const result = await Message.updateMany(
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
  );

  const readAt = new Date().toISOString();
  const io = getSocketServer();

  io.to(`conversation:${conversationId}`)
    .to(`user:${currentUserId}`)
    .emit("conversation:read", {
      conversationId,
      userId: currentUserId,
      readAt,
    });

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

  message.deletedForEveryoneAt = deletedAt;
  message.content = "This message was deleted";
  message.type = "text";
  message.attachment = null;

  /**
   * The physical Cloudinary asset is not removed here because
   * forwarded messages may still reference the same attachment.
   */
  await message.save();

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

  await message.save();
  await message.populate(messagePopulateOptions);

  const realtimeMessage = message.toJSON();
  const io = getSocketServer();

  for (const participantId of conversation.participants) {
    io.to(`user:${participantId.toString()}`).emit("message:updated", {
      conversationId,
      message: realtimeMessage,
    });
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
      message: realtimeMessage,
    });
  }

  return message;
};
