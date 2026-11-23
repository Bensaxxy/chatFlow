export interface ConversationUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio?: string;
  lastSeenAt?: string | null;
}

export interface ConversationLastMessage {
  _id: string;
  content: string;
  type: "text" | "image" | "file" | "audio";
  sender: ConversationUser;
  createdAt: string;
  editedAt: string | null;
  deletedForEveryoneAt: string | null;
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  participants: ConversationUser[];
  name: string | null;
  avatarUrl: string | null;
  lastMessage: ConversationLastMessage | null;
  unreadCount?: number;
  isPinned?: boolean;
  updatedAt: string;
}

export interface SearchUser extends ConversationUser {
  isOnline?: boolean;
}
