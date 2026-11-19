"use client";

import {
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Volume2,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "react-toastify";

import UserAvatar from "@/components/chat/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { getPublicUserProfile } from "@/services/user.service";
import type {
  ActiveAudioCall,
  AudioCallEndReason,
  AudioCallParticipant,
  WebRtcIceCandidatePayload,
  WebRtcSessionDescriptionPayload,
} from "@/types/call";

export type AudioCallPhase =
  | "idle"
  | "ringing"
  | "calling"
  | "connecting"
  | "connected";

interface StartAudioCallInput {
  conversationId: string;
  participant: AudioCallParticipant;
}

interface AudioCallContextValue {
  activeCall: ActiveAudioCall | null;
  phase: AudioCallPhase;
  isMuted: boolean;
  startAudioCall: (input: StartAudioCallInput) => Promise<void>;
  answerAudioCall: () => Promise<void>;
  declineAudioCall: () => void;
  endAudioCall: () => void;
  toggleMute: () => void;
}

const AudioCallContext = createContext<AudioCallContextValue | undefined>(
  undefined,
);

const CALL_ACKNOWLEDGEMENT_TIMEOUT_MS = 12_000;

const createCallId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const random = Math.floor(Math.random() * 16);
      const value = character === "x" ? random : (random & 0x3) | 0x8;

      return value.toString(16);
    },
  );
};

const getRtcConfiguration = (): RTCConfiguration => {
  const fallbackIceServers: RTCIceServer[] = [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ];
  const configuredServers = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS;

  if (!configuredServers) {
    return {
      iceServers: fallbackIceServers,
    };
  }

  try {
    const parsedServers: unknown = JSON.parse(configuredServers);

    if (Array.isArray(parsedServers) && parsedServers.length > 0) {
      return {
        iceServers: parsedServers as RTCIceServer[],
      };
    }
  } catch {
    // Keep a reliable STUN fallback when a deployment value is malformed.
  }

  return {
    iceServers: fallbackIceServers,
  };
};

const toSessionDescriptionPayload = (
  description: RTCSessionDescriptionInit,
): WebRtcSessionDescriptionPayload | null => {
  if (
    (description.type !== "offer" && description.type !== "answer") ||
    !description.sdp
  ) {
    return null;
  }

  return {
    type: description.type,
    sdp: description.sdp,
  };
};

const toIceCandidatePayload = (
  candidate: RTCIceCandidate,
): WebRtcIceCandidatePayload | null => {
  const serializedCandidate = candidate.toJSON();

  if (!serializedCandidate.candidate) {
    return null;
  }

  return {
    candidate: serializedCandidate.candidate,
    sdpMid: serializedCandidate.sdpMid ?? null,
    sdpMLineIndex: serializedCandidate.sdpMLineIndex ?? null,
    usernameFragment: serializedCandidate.usernameFragment ?? null,
  };
};

const getMicrophoneErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone access is required to make an audio call.";
    }

    if (error.name === "NotFoundError") {
      return "No microphone was found on this device.";
    }

    if (error.name === "NotReadableError") {
      return "Your microphone is being used by another application.";
    }
  }

  return "Could not access your microphone. Please try again.";
};

const formatDuration = (durationInSeconds: number): string => {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function AudioCallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [activeCall, setActiveCall] = useState<ActiveAudioCall | null>(null);
  const [phase, setPhase] = useState<AudioCallPhase>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const activeCallRef = useRef<ActiveAudioCall | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const incomingOfferRef = useRef<WebRtcSessionDescriptionPayload | null>(
    null,
  );
  const pendingRemoteCandidatesRef = useRef<WebRtcIceCandidatePayload[]>([]);
  const pendingLocalCandidatesRef = useRef<WebRtcIceCandidatePayload[]>([]);
  const isCallRegisteredRef = useRef(false);
  const acknowledgementTimeoutRef = useRef<number | null>(null);

  const updateActiveCall = useCallback((call: ActiveAudioCall | null): void => {
    activeCallRef.current = call;
    setActiveCall(call);
  }, []);

  const clearAcknowledgementTimeout = useCallback((): void => {
    if (acknowledgementTimeoutRef.current !== null) {
      window.clearTimeout(acknowledgementTimeoutRef.current);
      acknowledgementTimeoutRef.current = null;
    }
  }, []);

  const cleanupCall = useCallback((): void => {
    clearAcknowledgementTimeout();

    const peerConnection = peerConnectionRef.current;

    if (peerConnection) {
      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    }

    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    incomingOfferRef.current = null;
    pendingRemoteCandidatesRef.current = [];
    pendingLocalCandidatesRef.current = [];
    isCallRegisteredRef.current = false;

    setRemoteStream(null);
    setIsMuted(false);
    setPhase("idle");
    updateActiveCall(null);
  }, [clearAcknowledgementTimeout, updateActiveCall]);

  const hasActiveCall = useCallback((callId: string): boolean => {
    return activeCallRef.current?.callId === callId;
  }, []);

  const flushLocalCandidates = useCallback((): void => {
    const call = activeCallRef.current;

    if (!call || !isCallRegisteredRef.current) {
      return;
    }

    const candidates = pendingLocalCandidatesRef.current;
    pendingLocalCandidatesRef.current = [];

    for (const candidate of candidates) {
      socket.emit("call:ice-candidate", {
        callId: call.callId,
        conversationId: call.conversationId,
        candidate,
      });
    }
  }, [socket]);

  const applyPendingRemoteCandidates = useCallback(async (): Promise<void> => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection?.remoteDescription) {
      return;
    }

    const candidates = pendingRemoteCandidatesRef.current;
    pendingRemoteCandidatesRef.current = [];

    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(candidate);
    }
  }, []);

  const createPeerConnection = useCallback(
    (callId: string, conversationId: string): RTCPeerConnection => {
      const peerConnection = new RTCPeerConnection(getRtcConfiguration());

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        const candidate = toIceCandidatePayload(event.candidate);

        if (!candidate) {
          return;
        }
        const call = activeCallRef.current;

        if (
          !call ||
          call.callId !== callId ||
          call.conversationId !== conversationId
        ) {
          return;
        }

        if (!isCallRegisteredRef.current) {
          pendingLocalCandidatesRef.current.push(candidate);
          return;
        }

        socket.emit("call:ice-candidate", {
          callId,
          conversationId,
          candidate,
        });
      };

      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;

        setRemoteStream(stream ?? new MediaStream([event.track]));
      };

      peerConnection.onconnectionstatechange = () => {
        const call = activeCallRef.current;

        if (!call || call.callId !== callId) {
          return;
        }

        if (peerConnection.connectionState === "connected") {
          const connectedCall = {
            ...call,
            connectedAt: call.connectedAt ?? Date.now(),
          };

          updateActiveCall(connectedCall);
          setPhase("connected");
          return;
        }

        if (peerConnection.connectionState === "failed") {
          socket.emit("call:end", {
            callId,
            conversationId,
            reason: "failed",
          });
          cleanupCall();
          toast.error("The audio call could not be connected.");
        }
      };

      peerConnectionRef.current = peerConnection;

      return peerConnection;
    },
    [cleanupCall, socket, updateActiveCall],
  );

  const addRemoteCandidate = useCallback(
    async (candidate: WebRtcIceCandidatePayload): Promise<void> => {
      const peerConnection = peerConnectionRef.current;

      if (!peerConnection?.remoteDescription) {
        pendingRemoteCandidatesRef.current.push(candidate);
        return;
      }

      await peerConnection.addIceCandidate(candidate);
    },
    [],
  );

  const startAudioCall = useCallback(
    async ({ conversationId, participant }: StartAudioCallInput): Promise<void> => {
      if (!isConnected || !socket.connected) {
        toast.error("Reconnecting to ChatFlow. Please try the call again shortly.");
        return;
      }

      if (activeCallRef.current) {
        toast.info("Finish your current call before starting another one.");
        return;
      }

      const call: ActiveAudioCall = {
        callId: createCallId(),
        conversationId,
        participant,
        direction: "outgoing",
        connectedAt: null,
      };

      updateActiveCall(call);
      setPhase("connecting");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        if (!hasActiveCall(call.callId)) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;

        const peerConnection = createPeerConnection(
          call.callId,
          call.conversationId,
        );

        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const offerPayload = toSessionDescriptionPayload(offer);

        if (!offerPayload) {
          throw new Error("Could not prepare the call offer");
        }

        acknowledgementTimeoutRef.current = window.setTimeout(() => {
          if (activeCallRef.current?.callId === call.callId) {
            socket.emit("call:end", {
              callId: call.callId,
              conversationId: call.conversationId,
              reason: "cancelled",
            });
            cleanupCall();
            toast.error("The call could not be started. Please try again.");
          }
        }, CALL_ACKNOWLEDGEMENT_TIMEOUT_MS);

        socket.emit(
          "call:initiate",
          {
            callId: call.callId,
            conversationId: call.conversationId,
            offer: offerPayload,
          },
          (result) => {
            if (activeCallRef.current?.callId !== call.callId) {
              return;
            }

            clearAcknowledgementTimeout();

            if (!result.success) {
              cleanupCall();
              toast.error(result.message);
              return;
            }

            isCallRegisteredRef.current = true;
            flushLocalCandidates();
            setPhase("calling");
          },
        );
      } catch (error) {
        cleanupCall();
        toast.error(getMicrophoneErrorMessage(error));
      }
    },
    [
      clearAcknowledgementTimeout,
      cleanupCall,
      createPeerConnection,
      flushLocalCandidates,
      hasActiveCall,
      isConnected,
      socket,
      updateActiveCall,
    ],
  );

  const answerAudioCall = useCallback(async (): Promise<void> => {
    const call = activeCallRef.current;
    const offer = incomingOfferRef.current;

    if (!call || call.direction !== "incoming" || !offer) {
      return;
    }

    // Prevent a fast double tap from creating two microphone requests.
    incomingOfferRef.current = null;
    setPhase("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      if (activeCallRef.current?.callId !== call.callId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;

      const peerConnection = createPeerConnection(
        call.callId,
        call.conversationId,
      );

      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      await peerConnection.setRemoteDescription(offer);
      await applyPendingRemoteCandidates();

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      const answerPayload = toSessionDescriptionPayload(answer);

      if (!answerPayload) {
        throw new Error("Could not prepare the call answer");
      }

      acknowledgementTimeoutRef.current = window.setTimeout(() => {
        if (activeCallRef.current?.callId === call.callId) {
          socket.emit("call:end", {
            callId: call.callId,
            conversationId: call.conversationId,
            reason: "failed",
          });
          cleanupCall();
          toast.error("The call could not be answered. Please try again.");
        }
      }, CALL_ACKNOWLEDGEMENT_TIMEOUT_MS);

      socket.emit(
        "call:answer",
        {
          callId: call.callId,
          conversationId: call.conversationId,
          answer: answerPayload,
        },
        (result) => {
          if (activeCallRef.current?.callId !== call.callId) {
            return;
          }

          clearAcknowledgementTimeout();

          if (!result.success) {
            cleanupCall();
            toast.error(result.message);
            return;
          }

          isCallRegisteredRef.current = true;
          flushLocalCandidates();
        },
      );
    } catch (error) {
      socket.emit("call:end", {
        callId: call.callId,
        conversationId: call.conversationId,
        reason: "declined",
      });
      cleanupCall();
      toast.error(getMicrophoneErrorMessage(error));
    }
  }, [
    applyPendingRemoteCandidates,
    clearAcknowledgementTimeout,
    cleanupCall,
    createPeerConnection,
    flushLocalCandidates,
    socket,
  ]);

  const endCall = useCallback(
    (reason: AudioCallEndReason): void => {
      const call = activeCallRef.current;

      if (!call) {
        return;
      }

      socket.emit("call:end", {
        callId: call.callId,
        conversationId: call.conversationId,
        reason,
      });
      cleanupCall();
    },
    [cleanupCall, socket],
  );

  const declineAudioCall = useCallback((): void => {
    endCall("declined");
  }, [endCall]);

  const endAudioCall = useCallback((): void => {
    const call = activeCallRef.current;

    if (!call) {
      return;
    }

    endCall(call.direction === "outgoing" && phase === "calling" ? "cancelled" : "ended");
  }, [endCall, phase]);

  const toggleMute = useCallback((): void => {
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];

    if (audioTracks.length === 0) {
      return;
    }

    const nextMutedState = !audioTracks.every((track) => !track.enabled);

    audioTracks.forEach((track) => {
      track.enabled = !nextMutedState;
    });

    setIsMuted(nextMutedState);
  }, []);

  useEffect(() => {
    const handleIncomingCall = (payload: {
      callId: string;
      conversationId: string;
      callerId: string;
      offer: WebRtcSessionDescriptionPayload;
    }): void => {
      if (!user || payload.callerId === user._id) {
        return;
      }

      if (activeCallRef.current) {
        socket.emit("call:end", {
          callId: payload.callId,
          conversationId: payload.conversationId,
          reason: "declined",
        });
        return;
      }

      const initialCall: ActiveAudioCall = {
        callId: payload.callId,
        conversationId: payload.conversationId,
        participant: {
          userId: payload.callerId,
          name: "Incoming caller",
          avatarUrl: null,
        },
        direction: "incoming",
        connectedAt: null,
      };

      incomingOfferRef.current = payload.offer;
      updateActiveCall(initialCall);
      setPhase("ringing");

      void getPublicUserProfile(payload.callerId)
        .then((profile) => {
          const currentCall = activeCallRef.current;

          if (!currentCall || currentCall.callId !== payload.callId) {
            return;
          }

          updateActiveCall({
            ...currentCall,
            participant: {
              userId: profile._id,
              name: profile.name,
              avatarUrl: profile.avatarUrl,
            },
          });
        })
        .catch(() => {
          // The generic caller label still gives the recipient a safe choice.
        });
    };

    const handleCallAccepted = (payload: {
      callId: string;
      conversationId: string;
      acceptedByUserId: string;
      acceptedBySocketId: string;
      answer: WebRtcSessionDescriptionPayload;
    }): void => {
      const call = activeCallRef.current;

      if (!call || call.callId !== payload.callId) {
        return;
      }

      if (call.direction === "incoming") {
        if (payload.acceptedBySocketId !== socket.id) {
          cleanupCall();
          toast.info("This call was answered on another device.");
        }

        return;
      }

      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) {
        return;
      }

      void peerConnection
        .setRemoteDescription(payload.answer)
        .then(() => applyPendingRemoteCandidates())
        .then(() => setPhase("connecting"))
        .catch(() => {
          socket.emit("call:end", {
            callId: call.callId,
            conversationId: call.conversationId,
            reason: "failed",
          });
          cleanupCall();
          toast.error("The audio call could not be connected.");
        });
    };

    const handleIceCandidate = (payload: {
      callId: string;
      conversationId: string;
      candidate: WebRtcIceCandidatePayload;
    }): void => {
      const call = activeCallRef.current;

      if (
        !call ||
        call.callId !== payload.callId ||
        call.conversationId !== payload.conversationId
      ) {
        return;
      }

      void addRemoteCandidate(payload.candidate).catch(() => {
        // ICE candidates can arrive after a call has ended. They are safe to ignore.
      });
    };

    const handleCallEnded = (payload: {
      callId: string;
      conversationId: string;
      endedByUserId: string | null;
      reason: AudioCallEndReason;
    }): void => {
      const call = activeCallRef.current;

      if (!call || call.callId !== payload.callId) {
        return;
      }

      cleanupCall();

      if (payload.endedByUserId === user?._id) {
        return;
      }

      if (payload.reason === "declined") {
        toast.info("The call was declined.");
      } else if (payload.reason === "missed") {
        toast.info("The call was not answered.");
      } else if (payload.reason === "failed") {
        toast.error("The call could not be connected.");
      } else {
        toast.info("The call ended.");
      }
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:ended", handleCallEnded);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:ended", handleCallEnded);
    };
  }, [
    addRemoteCandidate,
    applyPendingRemoteCandidates,
    cleanupCall,
    socket,
    updateActiveCall,
    user,
  ]);

  useEffect(() => {
    if (!user) {
      cleanupCall();
    }
  }, [cleanupCall, user]);

  useEffect(() => {
    return () => cleanupCall();
  }, [cleanupCall]);

  const value = useMemo<AudioCallContextValue>(
    () => ({
      activeCall,
      phase,
      isMuted,
      startAudioCall,
      answerAudioCall,
      declineAudioCall,
      endAudioCall,
      toggleMute,
    }),
    [
      activeCall,
      answerAudioCall,
      declineAudioCall,
      endAudioCall,
      isMuted,
      phase,
      startAudioCall,
      toggleMute,
    ],
  );

  return (
    <AudioCallContext.Provider value={value}>
      {children}
      <AudioCallOverlay remoteStream={remoteStream} />
    </AudioCallContext.Provider>
  );
}

function AudioCallOverlay({ remoteStream }: { remoteStream: MediaStream | null }) {
  const {
    activeCall,
    answerAudioCall,
    declineAudioCall,
    endAudioCall,
    isMuted,
    phase,
    toggleMute,
  } = useAudioCall();
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!activeCall?.connectedAt || phase !== "connected") {
      setDuration(0);
      return;
    }

    const updateDuration = (): void => {
      setDuration(Math.max(0, Math.floor((Date.now() - activeCall.connectedAt!) / 1000)));
    };

    updateDuration();
    const intervalId = window.setInterval(updateDuration, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeCall?.connectedAt, phase]);

  if (!activeCall) {
    return null;
  }

  const isIncoming = activeCall.direction === "incoming";
  const isRinging = phase === "ringing";
  const canToggleMute = phase === "connecting" || phase === "connected";
  const status = isRinging
    ? "Incoming audio call"
    : phase === "calling"
      ? "Calling…"
      : phase === "connecting"
        ? "Connecting securely…"
        : `Connected · ${formatDuration(duration)}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-call-title"
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/15 bg-slate-950 text-white shadow-2xl"
      >
        <audio ref={remoteAudioRef} autoPlay playsInline />

        <div className="bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.34),transparent_58%)] px-6 pb-8 pt-10 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/15 bg-slate-800 shadow-xl">
            <UserAvatar
              name={activeCall.participant.name}
              avatarUrl={activeCall.participant.avatarUrl}
              className="h-full w-full text-2xl"
              fallbackClassName="bg-cyan-100 font-semibold text-cyan-800"
            />
          </div>

          <h2 id="audio-call-title" className="mt-5 text-xl font-semibold">
            {activeCall.participant.name}
          </h2>

          <p className="mt-1 text-sm text-slate-300">{status}</p>

          {phase === "calling" && (
            <span className="mx-auto mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200">
              <Phone className="h-5 w-5 animate-pulse" />
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-5 bg-slate-900 px-6 py-6">
          {isIncoming && isRinging ? (
            <>
              <button
                type="button"
                onClick={declineAudioCall}
                aria-label="Decline audio call"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-400 focus:outline-none focus:ring-4 focus:ring-red-300/30"
              >
                <PhoneOff className="h-6 w-6" />
              </button>

              <button
                type="button"
                onClick={() => void answerAudioCall()}
                aria-label="Answer audio call"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-300/30"
              >
                <PhoneIncoming className="h-6 w-6" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={!canToggleMute}
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                title={isMuted ? "Unmute" : "Mute"}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-100">
                <Volume2 className="h-5 w-5" />
              </span>

              <button
                type="button"
                onClick={endAudioCall}
                aria-label={phase === "calling" ? "Cancel audio call" : "End audio call"}
                title={phase === "calling" ? "Cancel call" : "End call"}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-400 focus:outline-none focus:ring-4 focus:ring-red-300/30"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export const useAudioCall = (): AudioCallContextValue => {
  const context = useContext(AudioCallContext);

  if (!context) {
    throw new Error("useAudioCall must be used inside AudioCallProvider");
  }

  return context;
};
