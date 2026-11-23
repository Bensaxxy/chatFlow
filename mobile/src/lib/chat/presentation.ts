import type { Conversation, ConversationUser } from "@/types/conversation";

export const getConversationPeer = (
  conversation: Conversation,
  currentUserId: string,
): ConversationUser | null =>
  conversation.participants.find((participant) => participant._id !== currentUserId) ??
  conversation.participants[0] ??
  null;

export const getConversationName = (
  conversation: Conversation,
  currentUserId: string,
): string => {
  if (conversation.name?.trim()) {
    return conversation.name;
  }

  return getConversationPeer(conversation, currentUserId)?.name ?? "Chat";
};

export const formatConversationTime = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};
