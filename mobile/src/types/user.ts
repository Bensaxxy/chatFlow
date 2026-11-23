import type { ConversationUser } from "@/types/conversation";

export interface UserMessagingStatus {
  isBlockedByCurrentUser: boolean;
  canMessage: boolean;
}

export interface PublicUserProfile extends ConversationUser, UserMessagingStatus {
  createdAt: string;
  updatedAt: string;
}
