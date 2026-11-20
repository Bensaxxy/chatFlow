import type { RequestHandler } from "express";
import { z } from "zod";

import { env } from "../config/env";
import { asyncHandler } from "../utils/async-handler";

const iceServerSchema = z.object({
  urls: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  username: z.string().optional(),
  credential: z.string().optional(),
  credentialType: z.enum(["password", "oauth"]).optional(),
});

const iceServersSchema = z.array(iceServerSchema).min(1);

const fallbackIceServers = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
];

const getIceServers = () => {
  if (!env.WEBRTC_ICE_SERVERS) {
    return fallbackIceServers;
  }

  try {
    return iceServersSchema.parse(JSON.parse(env.WEBRTC_ICE_SERVERS));
  } catch (error) {
    console.error("WEBRTC_ICE_SERVERS is invalid; using the STUN fallback:", error);

    return fallbackIceServers;
  }
};

export const getCallIceServers: RequestHandler = asyncHandler(
  async (_request, response) => {
    const iceServers = getIceServers();

    response.status(200).json({
      success: true,
      message: "Call connectivity configuration retrieved successfully",
      data: {
        iceServers,
        hasTurnServer: iceServers.some((server) => {
          const urls = Array.isArray(server.urls) ? server.urls : [server.urls];

          return urls.some(
            (url) => url.startsWith("turn:") || url.startsWith("turns:"),
          );
        }),
      },
    });
  },
);
