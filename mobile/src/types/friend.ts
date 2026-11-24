export type FriendshipStatus = "pending" | "accepted";

export type FriendRequestDirection = "incoming" | "outgoing";

export type FriendshipChangedAction =
  | "request_received"
  | "request_accepted"
  | "request_declined"
  | "request_cancelled"
  | "friend_removed";

export interface FriendUser {
  _id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface FriendshipView {
  friendshipId: string;
  status: FriendshipStatus;
  requestedBy: string;
  user: FriendUser;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FriendSuggestionsPage {
  users: FriendUser[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FriendsPage {
  friends: FriendshipView[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FriendRequestsPage {
  requests: FriendshipView[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FriendshipChangedPayload {
  action: FriendshipChangedAction;
  friendshipId: string;
  userId: string;
}
