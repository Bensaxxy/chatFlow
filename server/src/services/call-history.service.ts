import { isValidObjectId, Types } from "mongoose";

import { CallHistory } from "../models/call-history.model";
import { Conversation } from "../models/conversation.model";
import { AppError } from "../utils/app-error";

export type CallHistoryStatus =
  | "completed"
  | "missed"
  | "declined"
  | "cancelled"
  | "failed";

const callParticipantFields = "name email avatarUrl";

export const createCallHistory = async (
  conversationId: string,
  callerId: string,
  recipientId: string,
) => {
  const history = await CallHistory.create({
    conversation: conversationId,
    caller: callerId,
    recipient: recipientId,
  });

  return history._id.toString();
};

export const markCallHistoryAnswered = async (historyId: string): Promise<void> => {
  if (!isValidObjectId(historyId)) {
    return;
  }

  await CallHistory.updateOne(
    {
      _id: historyId,
      status: "ringing",
    },
    {
      $set: {
        answeredAt: new Date(),
      },
    },
  );
};

export const completeCallHistory = async (
  historyId: string,
  status: CallHistoryStatus,
  endedByUserId: string | null,
): Promise<void> => {
  if (!isValidObjectId(historyId)) {
    return;
  }

  const history = await CallHistory.findById(historyId);

  if (!history || history.endedAt) {
    return;
  }

  const endedAt = new Date();
  const durationSeconds = history.answeredAt
    ? Math.max(0, Math.floor((endedAt.getTime() - history.answeredAt.getTime()) / 1000))
    : 0;

  history.status = status;
  history.endedAt = endedAt;
  history.endedBy =
    endedByUserId && isValidObjectId(endedByUserId)
      ? new Types.ObjectId(endedByUserId)
      : null;
  history.durationSeconds = durationSeconds;
  await history.save();
};

export const getConversationCallHistory = async (
  conversationId: string,
  currentUserId: string,
) => {
  const conversation = await Conversation.exists({
    _id: conversationId,
    participants: currentUserId,
  });

  if (!conversation) {
    throw new AppError("Conversation was not found", 404, "CONVERSATION_NOT_FOUND");
  }

  const staleBefore = new Date(Date.now() - 2 * 60 * 1000);

  await CallHistory.updateMany(
    {
      conversation: conversationId,
      status: "ringing",
      startedAt: { $lt: staleBefore },
    },
    {
      $set: {
        status: "missed",
        endedAt: staleBefore,
        durationSeconds: 0,
      },
    },
  );

  return CallHistory.find({
    conversation: conversationId,
  })
    .populate("caller", callParticipantFields)
    .populate("recipient", callParticipantFields)
    .sort({ startedAt: -1 })
    .limit(100)
    .lean();
};
