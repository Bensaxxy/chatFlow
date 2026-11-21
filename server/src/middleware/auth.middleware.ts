import type { RequestHandler } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { User } from "../models/user.model";
import { AppError } from "../utils/app-error";
import { verifyAccessToken } from "../utils/auth-tokens";

export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  const accessToken = request.cookies?.accessToken as string | undefined;

  if (!accessToken) {
    next(
      new AppError(
        "Authentication is required",
        401,
        "AUTHENTICATION_REQUIRED",
      ),
    );

    return;
  }

  try {
    const payload = verifyAccessToken(accessToken);

    const sessionIsCurrent = await User.exists({
      _id: payload.userId,
      ...(payload.sessionVersion === 0
        ? {
            $or: [
              { sessionVersion: 0 },
              { sessionVersion: { $exists: false } },
            ],
          }
        : { sessionVersion: payload.sessionVersion }),
    });

    if (!sessionIsCurrent) {
      next(
        new AppError("Your session has expired", 401, "SESSION_EXPIRED"),
      );

      return;
    }

    request.auth = {
      userId: payload.userId,
      sessionVersion: payload.sessionVersion,
    };

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      next(
        new AppError("Access token has expired", 401, "ACCESS_TOKEN_EXPIRED"),
      );

      return;
    }

    if (error instanceof JsonWebTokenError) {
      next(
        new AppError("Access token is invalid", 401, "INVALID_ACCESS_TOKEN"),
      );

      return;
    }

    next(new AppError("Authentication failed", 401, "AUTHENTICATION_FAILED"));
  }
};
