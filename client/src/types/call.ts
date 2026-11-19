export type AudioCallEndReason =
  | "ended"
  | "cancelled"
  | "declined"
  | "missed"
  | "failed";

export interface WebRtcSessionDescriptionPayload {
  type: "offer" | "answer";
  sdp: string;
}

export interface WebRtcIceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
}

export interface AudioCallParticipant {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface IncomingAudioCallPayload {
  callId: string;
  conversationId: string;
  callerId: string;
  offer: WebRtcSessionDescriptionPayload;
}

export interface ActiveAudioCall {
  callId: string;
  conversationId: string;
  participant: AudioCallParticipant;
  direction: "incoming" | "outgoing";
  connectedAt: number | null;
}
