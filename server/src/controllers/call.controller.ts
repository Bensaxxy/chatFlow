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

const getTurnIceServersFromSeparateSettings = () => {
  const urls = env.WEBRTC_TURN_URLS?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (!urls?.length) {
    return null;
  }

  if (!env.WEBRTC_TURN_USERNAME || !env.WEBRTC_TURN_CREDENTIAL) {
    console.error(
      "WEBRTC_TURN_URLS is set without TURN credentials; ignoring the incomplete relay configuration.",
    );
    return null;
  }

  const result = iceServerSchema.safeParse({
    urls,
    username: env.WEBRTC_TURN_USERNAME,
    credential: env.WEBRTC_TURN_CREDENTIAL,
  });

  if (!result.success) {
    console.error(
      "WEBRTC_TURN_URLS is invalid; ignoring the relay configuration:",
      result.error.flatten(),
    );
    return null;
  }

  return [
    ...fallbackIceServers,
    result.data,
  ];
};

const getIceServers = () => {
  if (env.WEBRTC_ICE_SERVERS) {
    try {
      const result = iceServersSchema.safeParse(
        JSON.parse(env.WEBRTC_ICE_SERVERS),
      );

      if (result.success) {
        return result.data;
      }

      console.error(
        "WEBRTC_ICE_SERVERS is invalid; checking separate TURN settings:",
        result.error.flatten(),
      );
    } catch (error) {
      console.error(
        "WEBRTC_ICE_SERVERS is not valid JSON; checking separate TURN settings:",
        error,
      );
    }
  }

  return getTurnIceServersFromSeparateSettings() ?? fallbackIceServers;
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
