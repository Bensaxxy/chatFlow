export const queryKeys = {
  publicProfile: (userId: string) => ["public-profile", userId] as const,
  conversations: (userId: string) => ["conversations", userId] as const,
  conversationMessages: (userId: string, conversationId: string) =>
    ["conversation-messages", userId, conversationId] as const,
};
