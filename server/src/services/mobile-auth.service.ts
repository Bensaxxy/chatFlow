import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { isValidObjectId } from "mongoose";

import { env } from "../config/env";
import { MobileSession } from "../models/mobile-session.model";
import { User } from "../models/user.model";
import { AppError } from "../utils/app-error";
import { createAccessToken } from "../utils/auth-tokens";

import type {
  MobileLoginInput,
  MobileRefreshInput,
} from "../validations/auth.validation";

const REFRESH_TOKEN_BYTE_LENGTH = 48;

const createRefreshTokenSecret = (): string =>
  randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString("hex");

const hashRefreshTokenSecret = (secret: string): string =>
  createHash("sha256").update(secret).digest("hex");

const refreshTokenHashesMatch = (
  storedHash: string,
  suppliedHash: string,
): boolean => {
  const storedBuffer = Buffer.from(storedHash, "hex");

  const suppliedBuffer = Buffer.from(suppliedHash, "hex");

  if (storedBuffer.length !== suppliedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, suppliedBuffer);
};

const serializeRefreshToken = (sessionId: string, secret: string): string =>
  `${sessionId}.${secret}`;

const parseRefreshToken = (
  refreshToken: string,
): {
  sessionId: string;
  secret: string;
} => {
  const separatorIndex = refreshToken.indexOf(".");

  if (separatorIndex <= 0 || separatorIndex !== refreshToken.lastIndexOf(".")) {
    throw new AppError(
      "Mobile session is invalid or has expired",
      401,
      "INVALID_MOBILE_REFRESH_TOKEN",
    );
  }

  const sessionId = refreshToken.slice(0, separatorIndex);

  const secret = refreshToken.slice(separatorIndex + 1);

  if (!isValidObjectId(sessionId) || !/^[a-f0-9]{96}$/i.test(secret)) {
    throw new AppError(
      "Mobile session is invalid or has expired",
      401,
      "INVALID_MOBILE_REFRESH_TOKEN",
    );
  }

  return {
    sessionId,
    secret,
  };
};

interface MobileTokens {
  accessToken: string;
  refreshToken: string;
}

export const createMobileSession = async (
  userId: string,
  sessionVersion: number,
  input: Pick<MobileLoginInput, "deviceId" | "deviceName">,
): Promise<MobileTokens> => {
  /*
   * One active session is kept for each user/device
   * combination.
   */
  await MobileSession.deleteOne({
    user: userId,
    deviceId: input.deviceId,
  });

  const refreshTokenSecret = createRefreshTokenSecret();

  const now = new Date();

  const session = await MobileSession.create({
    user: userId,
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    sessionVersion,

    refreshTokenHash: hashRefreshTokenSecret(refreshTokenSecret),

    previousRefreshTokenHash: null,
    lastUsedAt: now,

    expiresAt: new Date(now.getTime() + env.REFRESH_TOKEN_TTL_SECONDS * 1000),
  });

  return {
    accessToken: createAccessToken(userId, sessionVersion),

    refreshToken: serializeRefreshToken(
      session._id.toString(),
      refreshTokenSecret,
    ),
  };
};

export const refreshMobileSession = async (
  input: MobileRefreshInput,
): Promise<{
  user: InstanceType<typeof User>;
  accessToken: string;
  refreshToken: string;
}> => {
  const { sessionId, secret } = parseRefreshToken(input.refreshToken);

  const session = await MobileSession.findById(sessionId).select(
    "+refreshTokenHash +previousRefreshTokenHash",
  );

  if (!session) {
    throw new AppError(
      "Mobile session is invalid or has expired",
      401,
      "INVALID_MOBILE_REFRESH_TOKEN",
    );
  }

  const suppliedHash = hashRefreshTokenSecret(secret);

  /*
   * If the previous refresh token is used again,
   * the token may have been copied. Revoke the
   * session instead of issuing another token.
   */
  if (
    session.previousRefreshTokenHash &&
    refreshTokenHashesMatch(session.previousRefreshTokenHash, suppliedHash)
  ) {
    await session.deleteOne();

    throw new AppError(
      "This mobile session has been revoked. Sign in again.",
      401,
      "MOBILE_REFRESH_TOKEN_REUSED",
    );
  }

  if (!refreshTokenHashesMatch(session.refreshTokenHash, suppliedHash)) {
    throw new AppError(
      "Mobile session is invalid or has expired",
      401,
      "INVALID_MOBILE_REFRESH_TOKEN",
    );
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await session.deleteOne();

    throw new AppError(
      "Mobile session has expired. Sign in again.",
      401,
      "MOBILE_SESSION_EXPIRED",
    );
  }

  const user = await User.findById(session.user);

  if (!user) {
    await session.deleteOne();

    throw new AppError(
      "Mobile session is invalid or has expired",
      401,
      "INVALID_MOBILE_REFRESH_TOKEN",
    );
  }

  if (user.sessionVersion !== session.sessionVersion) {
    await session.deleteOne();

    throw new AppError(
      "Your session has expired. Sign in again.",
      401,
      "SESSION_EXPIRED",
    );
  }

  if (!user.isEmailVerified) {
    await session.deleteOne();

    throw new AppError(
      "Verify your email address before logging in",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  const newRefreshTokenSecret = createRefreshTokenSecret();

  session.previousRefreshTokenHash = session.refreshTokenHash;

  session.refreshTokenHash = hashRefreshTokenSecret(newRefreshTokenSecret);

  session.lastUsedAt = new Date();

  /*
   * Sliding expiration: an actively used mobile
   * session remains signed in.
   */
  session.expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000,
  );

  await session.save();

  return {
    user,

    accessToken: createAccessToken(user._id.toString(), user.sessionVersion),

    refreshToken: serializeRefreshToken(
      session._id.toString(),
      newRefreshTokenSecret,
    ),
  };
};

export const revokeMobileSession = async (
  refreshToken: string,
): Promise<void> => {
  let parsedToken: {
    sessionId: string;
    secret: string;
  };

  try {
    parsedToken = parseRefreshToken(refreshToken);
  } catch {
    return;
  }

  const session = await MobileSession.findById(parsedToken.sessionId).select(
    "+refreshTokenHash +previousRefreshTokenHash",
  );

  if (!session) {
    return;
  }

  const suppliedHash = hashRefreshTokenSecret(parsedToken.secret);

  const matchesCurrent = refreshTokenHashesMatch(
    session.refreshTokenHash,
    suppliedHash,
  );

  const matchesPrevious = session.previousRefreshTokenHash
    ? refreshTokenHashesMatch(session.previousRefreshTokenHash, suppliedHash)
    : false;

  if (matchesCurrent || matchesPrevious) {
    await session.deleteOne();
  }
};
