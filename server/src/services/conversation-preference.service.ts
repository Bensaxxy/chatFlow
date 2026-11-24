import { Types } from "mongoose";

import { ConversationPreference } from "../models/conversation-preference.model";

export interface ConversationPreferences {
  isPinned: boolean;
  isMarkedUnread: boolean;
  clearedAt: Date | null;
  mutedUntil: Date | null;
  isMuted: boolean;
  deletedAt: Date | null;
}

const emptyPreferences = (): ConversationPreferences => ({
  isPinned: false,
  isMarkedUnread: false,
  clearedAt: null,
  mutedUntil: null,
  isMuted: false,
  deletedAt: null,
});

const serializePreferences = (preference: {
  pinnedAt?: Date | null;
  markedUnreadAt?: Date | null;
  clearedAt?: Date | null;
  mutedUntil?: Date | null;
  isMuted?: boolean;
  deletedAt?: Date | null;
} | null): ConversationPreferences => {
  const mutedUntil = preference?.mutedUntil ?? null;

  return {
    isPinned: Boolean(preference?.pinnedAt),
    isMarkedUnread: Boolean(preference?.markedUnreadAt),
    clearedAt: preference?.clearedAt ?? null,
    mutedUntil,
    // A timed mute is active only before its expiry; a null expiry represents Always.
    isMuted: mutedUntil
      ? mutedUntil.getTime() > Date.now()
      : Boolean(preference?.isMuted),
    deletedAt: preference?.deletedAt ?? null,
  };
};

export const getConversationPreference = async (
  userId: string,
  conversationId: string,
): Promise<ConversationPreferences> => {
  const preference = await ConversationPreference.findOne({
    user: userId,
    conversation: conversationId,
  })
    .select("pinnedAt markedUnreadAt clearedAt mutedUntil isMuted deletedAt")
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
    .select("conversation pinnedAt markedUnreadAt clearedAt mutedUntil isMuted deletedAt")
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

export const muteConversationForUser = async (userId: string, conversationId: string, durationHours: number | "always"): Promise<ConversationPreferences> => {
  const preference = await ConversationPreference.findOneAndUpdate({ user: userId, conversation: conversationId }, { $set: { mutedUntil: durationHours === "always" ? null : new Date(Date.now() + durationHours * 60 * 60 * 1000), isMuted: true } }, { new: true, upsert: true }).lean();
  return serializePreferences(preference);
};

export const unmuteConversationForUser = async (userId: string, conversationId: string): Promise<ConversationPreferences> => {
  const preference = await ConversationPreference.findOneAndUpdate({ user: userId, conversation: conversationId }, { $set: { mutedUntil: null, isMuted: false } }, { new: true, upsert: true }).lean();
  return serializePreferences(preference);
};

export const deleteConversationForUser = async (userId: string, conversationId: string): Promise<void> => {
  await ConversationPreference.findOneAndUpdate({ user: userId, conversation: conversationId }, { $set: { deletedAt: new Date(), clearedAt: new Date(), pinnedAt: null, markedUnreadAt: null } }, { upsert: true });
};

export const restoreConversationForUser = async (userId: string, conversationId: string): Promise<void> => {
  await ConversationPreference.updateOne({ user: userId, conversation: conversationId, deletedAt: { $ne: null } }, { $set: { deletedAt: null, clearedAt: new Date(), markedUnreadAt: null } });
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
