import jwt from "jsonwebtoken";

import { env } from "../config/env";

export const createAccessToken = (userId: string): string => {
  return jwt.sign(
    {
      tokenType: "access",
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId,
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    },
  );
};

export const createRefreshToken = (userId: string): string => {
  return jwt.sign(
    {
      tokenType: "refresh",
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: userId,
      expiresIn: env.REFRESH_TOKEN_TTL_SECONDS,
    },
  );
};

export const verifyAccessToken = (token: string): { userId: string } => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (
    typeof decoded === "string" ||
    decoded.tokenType !== "access" ||
    typeof decoded.sub !== "string"
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    userId: decoded.sub,
  };
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (
    typeof decoded === "string" ||
    decoded.tokenType !== "refresh" ||
    typeof decoded.sub !== "string"
  ) {
    throw new Error("Invalid refresh token payload");
  }

  return {
    userId: decoded.sub,
  };
};
