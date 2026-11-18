import { Types } from "mongoose";

import { Conversation } from "../models/conversation.model";
import { Message } from "../models/message.model";
import { getSocketServer } from "../socket/socket.server";
import { AppError } from "../utils/app-error";
import type {
  DeleteMessageInput,
  EditMessageInput,
  ForwardMessageInput,
  ListMessagesInput,
  SendMessageInput,
  UpdateMessageReactionInput,
} from "../validations/message.validation";

const senderFields = "name email avatarUrl";

const replyMessageFields =
  "content sender deletedFor deletedForEveryoneAt editedAt createdAt";

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

interface CreateRealtimeMessageOptions {
  conversationId: string;
  participantIds: string[];
  senderId: string;
  content: string;
  replyToMessageId?: string | null;
  isForwarded?: boolean;
  forwardedFromMessageId?: string | null;
}

const createRealtimeMessage = async ({
  conversationId,
  participantIds,
  senderId,
  content,
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
    type: "text",
    content,
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

  if (input.replyToMessageId) {
    const replyMessageExists = await Message.exists({
      _id: input.replyToMessageId,
      conversation: conversationId,
      deletedForEveryoneAt: null,
      deletedFor: {
        $ne: senderId,
      },
    });

    if (!replyMessageExists) {
      throw new AppError(
        "The message you are replying to was not found",
        404,
        "REPLY_MESSAGE_NOT_FOUND",
      );
    }
  }

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

  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: {
      $ne: currentUserId,
    },
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
  