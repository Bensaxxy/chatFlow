import jwt from "jsonwebtoken";

import { env } from "../config/env";

interface SessionTokenPayload {
  userId: string;
  sessionVersion: number;
}

const isValidSessionVersion = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

export const createAccessToken = (
  userId: string,
  sessionVersion: number,
): string => {
  return jwt.sign(
    {
      tokenType: "access",
      sessionVersion,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId,
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    },
  );
};

export const createRefreshToken = (
  userId: string,
  sessionVersion: number,
): string => {
  return jwt.sign(
    {
      tokenType: "refresh",
      sessionVersion,
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: userId,
      expiresIn: env.REFRESH_TOKEN_TTL_SECONDS,
    },
  );
};

/*
 * Socket.IO connects directly to the API host. On browsers that block
 * third-party cookies, the browser cannot attach the httpOnly session cookie
 * to that connection. This brief token is requested through the same-origin
 * API proxy and is used only during the socket handshake.
 */
export const createSocketToken = (
  userId: string,
  sessionVersion: number,
): string => {
  return jwt.sign(
    {
      tokenType: "socket",
      sessionVersion,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId,
      expiresIn: 2 * 60,
    },
  );
};

export const verifyAccessToken = (token: string): SessionTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (
    typeof decoded === "string" ||
    decoded.tokenType !== "access" ||
    typeof decoded.sub !== "string" ||
    !isValidSessionVersion(decoded.sessionVersion)
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    userId: decoded.sub,
    sessionVersion: decoded.sessionVersion,
  };
};

export const verifySocketToken = (token: string): SessionTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (
    typeof decoded === "string" ||
    decoded.tokenType !== "socket" ||
    typeof decoded.sub !== "string" ||
    !isValidSessionVersion(decoded.sessionVersion)
  ) {
    throw new Error("Invalid socket token payload");
  }

  return {
    userId: decoded.sub,
    sessionVersion: decoded.sessionVersion,
  };
};

export const verifyRefreshToken = (token: string): SessionTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (
    typeof decoded === "string" ||
    decoded.tokenType !== "refresh" ||
    typeof decoded.sub !== "string" ||
    !isValidSessionVersion(decoded.sessionVersion)
  ) {
    throw new Error("Invalid refresh token payload");
  }

  return {
    userId: decoded.sub,
    sessionVersion: decoded.sessionVersion,
  };
};
