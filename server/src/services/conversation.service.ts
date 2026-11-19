import { Types } from "mongoose";
import { Conversation } from "../models/conversation.model";
import { User } from "../models/user.model";
import { AppError } from "../utils/app-error";
import { getDirectMessagingAccess } from "./user.service";
import "../models/message.model";
import { Message } from "../models/message.model";

const participantFields = "name email avatarUrl bio lastSeenAt";

const getDirectKey = (firstUserId: string, secondUserId: string): string => {
  return [firstUserId, secondUserId].sort().join(":");
};

const isDuplicateKeyError = (error: unknown): error is { code: number } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
};

export const createDirectConversation = async (
  currentUserId: string,
  participantId: string,
) => {
  if (currentUserId === participantId) {
    throw new AppError(
      "You cannot start a conversation with yourself",
      400,
      "SELF_CONVERSATION_NOT_ALLOWED",
    );
  }

  const participantExists = await User.exists({
    _id: participantId,
  });

  if (!participantExists) {
    throw new AppError(
      "The selected user was not found",
      404,
      "PARTICIPANT_NOT_FOUND",
    );
  }

  const directMessagingAccess = await getDirectMessagingAccess(
    currentUserId,
    participantId,
  );

  if (!directMessagingAccess.canMessage) {
    throw new AppError(
      directMessagingAccess.isBlockedByCurrentUser
        ? "Unblock this user before starting a conversation"
        : "You cannot start a conversation with this user",
      403,
      "DIRECT_MESSAGING_BLOCKED",
    );
  }

  const directKey = getDirectKey(currentUserId, participantId);

  const existingConversation = await Conversation.findOne({
    directKey,
  }).populate("participants", participantFields);

  if (existingConversation) {
    return {
      conversation: existingConversation,
      created: false,
    };
  }

  try {
    const conversation = await Conversation.create({
      type: "direct",
      participants: [currentUserId, participantId],
      directKey,
      admins: [],
      createdBy: currentUserId,
    });

    await conversation.populate("participants", participantFields);

    return {
      conversation,
      created: true,
    };
  } catch (error) {
    /*
     * Two simultaneous requests could attempt to create
     * the same conversation. The unique directKey index
     * guarantees that only one succeeds.
     */
    if (isDuplicateKeyError(error)) {
      const conversation = await Conversation.findOne({
        directKey,
      }).populate("participants", participantFields);

      if (conversation) {
        return {
          conversation,
          created: false,
        };
      }
    }

    throw error;
  }
};

const lastMessageFields =
  "clientMessageId content type attachment linkPreview sender createdAt editedAt deletedFor " +
  "deletedForEveryoneAt isForwarded";

export const getUserConversations = async (currentUserId: string) => {
  const conversations = await Conversation.find({
    participants: currentUserId,
  })
    .populate("participants", participantFields)
    .populate({
      path: "lastMessage",
      select: lastMessageFields,
      populate: {
        path: "sender",
        select: participantFields,
      },
    })
    .sort({
      updatedAt: -1,
    });

  const conversationIds = conversations.map((conversation) => conversation._id);

  if (conversationIds.length === 0) {
    return [];
  }

  const currentUserObjectId = new Types.ObjectId(currentUserId);

  const unreadResults = await Message.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        conversation: {
          $in: conversationIds,
        },

        sender: {
          $ne: currentUserObjectId,
        },

        readBy: {
          $ne: currentUserObjectId,
        },

        deletedFor: {
          $ne: currentUserObjectId,
        },

        deletedForEveryoneAt: null,
      },
    },

    {
      $group: {
        _id: "$conversation",
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const unreadCountByConversation = new Map(
    unreadResults.map((result) => [result._id.toString(), result.count]),
  );

  return Promise.all(
    conversations.map(async (conversation) => {
      const otherParticipant =
        conversation.type === "direct"
          ? conversation.participants.find(
              (participant) => participant._id.toString() !== currentUserId,
            )
          : undefined;

      const directMessagingAccess = otherParticipant
        ? await getDirectMessagingAccess(
            currentUserId,
            otherParticipant._id.toString(),
          )
        : null;

      return {
        ...conversation.toJSON(),
        directMessagingAccess,
        unreadCount:
          unreadCountByConversation.get(conversation._id.toString()) ?? 0,
      };
    }),
  );
};

export const getConversationById = async (
  conversationId: string,
  currentUserId: string,
) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: currentUserId,
  })
    .populate("participants", participantFields)
    .populate({
      path: "lastMessage",
      select: lastMessageFields,
      populate: {
        path: "sender",
        select: participantFields,
      },
    });

  if (!conversation) {
    throw new AppError(
      "Conversation was not found",
      404,
      "CONVERSATION_NOT_FOUND",
    );
  }

  const otherParticipant =
    conversation.type === "direct"
      ? conversation.participants.find(
          (participant) => participant._id.toString() !== currentUserId,
        )
      : undefined;

  const directMessagingAccess = otherParticipant
    ? await getDirectMessagingAccess(
        currentUserId,
        otherParticipant._id.toString(),
      )
    : null;

  return {
    ...conversation.toJSON(),
    directMessagingAccess,
  };
};
