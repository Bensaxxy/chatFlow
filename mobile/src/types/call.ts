import type { ConversationUser } from "@/types/conversation";

export type CallHistoryStatus =
  | "ringing"
  | "completed"
  | "missed"
  | "declined"
  | "cancelled"
  | "failed";

export interface CallHistoryEntry {
  _id: string;
  conversation: string;
  caller: ConversationUser;
  recipient: ConversationUser;
  status: CallHistoryStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  endedBy: string | null;
  durationSeconds: number;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: "password" | "oauth";
}
