import { Types } from "mongoose";

import { ConversationPreference } from "../models/conversation-preference.model";

export interface ConversationPreferences {
  isPinned: boolean;
  isMarkedUnread: boolean;
  clearedAt: Date | null;
}

const emptyPreferences = (): ConversationPreferences => ({
  isPinned: false,
  isMarkedUnread: false,
  clearedAt: null,
});

const serializePreferences = (preference: {
  pinnedAt?: Date | null;
  markedUnreadAt?: Date | null;
  clearedAt?: Date | null;
} | null): ConversationPreferences => ({
  isPinned: Boolean(preference?.pinnedAt),
  isMarkedUnread: Boolean(preference?.markedUnreadAt),
  clearedAt: preference?.clearedAt ?? null,
});

export const getConversationPreference = async (
  userId: string,
  conversationId: string,
): Promise<ConversationPreferences> => {
  const preference = await ConversationPreference.findOne({
    user: userId,
    conversation: conversationId,
  })
    .select("pinnedAt markedUnreadAt clearedAt")
    .lean();

  return serializePreferences(preference);
};

export const getConversationPreferenceMap = async (
  userId: string,
  conversationIds: Types.ObjectId[],
): Promise<Map<string, ConversationPreferences>> => {
  if (conversationIds.length === 0) {
    return new Map();
  }

  const preferences = await ConversationPreference.find({
    user: userId,
    conversation: { $in: conversationIds },
  })
    .select("conversation pinnedAt markedUnreadAt clearedAt")
    .lean();

  return new Map(
    preferences.map((preference) => [
      preference.conversation.toString(),
      serializePreferences(preference),
    ]),
  );
};

export const setConversationPinned = async (
  userId: string,
  conversationId: string,
  isPinned: boolean,
): Promise<ConversationPreferences> => {
  const preference = await ConversationPreference.findOneAndUpdate(
    {
      user: userId,
      conversation: conversationId,
    },
    {
      $set: {
        pinnedAt: isPinned ? new Date() : null,
      },
    },
    {
      new: true,
      upsert: true,
    },
  ).lean();

  return serializePreferences(preference);
};

export const markConversationUnread = async (
  userId: string,
  conversationId: string,
): Promise<ConversationPreferences> => {
  const preference = await ConversationPreference.findOneAndUpdate(
    {
      user: userId,
      conversation: conversationId,
    },
    {
      $set: {
        markedUnreadAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
    },
  ).lean();

  return serializePreferences(preference);
};

export const clearConversationForUser = async (
  userId: string,
  conversationId: string,
): Promise<ConversationPreferences> => {
  const preference = await ConversationPreference.findOneAndUpdate(
    {
      user: userId,
      conversation: conversationId,
    },
    {
      $set: {
        clearedAt: new Date(),
        markedUnreadAt: null,
      },
    },
    {
      new: true,
      upsert: true,
    },
  ).lean();

  return serializePreferences(preference);
};

export const clearMarkedConversationUnread = async (
  userId: string,
  conversationId: string,
): Promise<void> => {
  await ConversationPreference.updateOne(
    {
      user: userId,
      conversation: conversationId,
    },
    {
      $set: {
        markedUnreadAt: null,
      },
    },
  );
};

export { emptyPreferences };
