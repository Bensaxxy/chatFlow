import { Conversation } from "../models/conversation.model";
import { Message } from "../models/message.model";
import { AppError } from "../utils/app-error";
import type {
  DeleteMessageInput,
  EditMessageInput,
  ListMessagesInput,
  SendMessageInput,
  UpdateMessageReactionInput,
} from "../validations/message.validation";
import { getSocketServer } from "../socket/socket.server";
import { Types } from "mongoose";

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

  const io = getSocketServer();

  const recipientIds = conversation.participants
    .map((participantId) => participantId.toString())
    .filter((participantId) => participantId !== senderId);

  /*
   * A message is considered delivered when at least one
   * device belonging to the recipient is connected.
   */
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
    content: input.content,

    replyTo: input.replyToMessageId ?? null,

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

  for (const participantId of conversation.participants) {
    const participantIdString = participantId.toString();

    io.to(`user:${participantIdString}`).emit("conversation:updated", {
      conversationId,
      message: realtimeMessage,

      updatedAt: message.createdAt.toISOString(),

      incrementUnread: participantIdString !== senderId,
    });
  }

  return message;
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

  /*
   * MongoDB returns newest first for efficient cursor
   * pagination. The frontend receives chronological order.
   */
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

  /*
   * Notify the open conversation and every device
   * belonging to the reader.
   */
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

    /**
     * Delete for me must only affect the current user's
     * browser tabs and devices.
     */
    io.to(`user:${currentUserId}`).emit("message:deleted", payload);

    return payload;
  }

  /**
   * Only the original sender can delete a message
   * for everyone.
   */
  if (message.sender.toString() !== currentUserId) {
    throw new AppError(
      "Only the sender can delete this message for everyone",
      403,
      "MESSAGE_DELETE_FORBIDDEN",
    );
  }

  const deletedAt = message.deletedForEveryoneAt ?? new Date();

  message.deletedForEveryoneAt = deletedAt;

  /**
   * Remove the original text from the database while
   * keeping the document for chat-history ordering.
   */
  message.content = "This message was deleted";

  await message.save();

  const payload = {
    conversationId,
    messageId,
    deletedByUserId: currentUserId,
    scope: "everyone" as const,
    deletedForEveryoneAt: deletedAt.toISOString(),
  };

  /**
   * Notify every participant through their personal
   * rooms, including users who have not opened the chat.
   */
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

  /*
   * Each user can have only one reaction
   * on a message.
   */
  for (let index = message.reactions.length - 1; index >= 0; index -= 1) {
    const reaction = message.reactions[index];

    if (reaction?.user.toString() === currentUserId) {
      message.reactions.splice(index, 1);
    }
  }

  /*
   * A null emoji means remove the reaction.
   */
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

  /*
   * Send the updated message to every
   * participant and all their devices.
   */
  for (const participantId of conversation.participants) {
    io.to(`user:${participantId.toString()}`).emit("message:updated", {
      conversationId,
      message: realtimeMessage,
    });
  }

  return message;
};
