import type { RequestHandler } from "express";

import {
  getCurrentUser,
  loginUser,
  registerUser,
} from "../services/auth.service";
import { asyncHandler } from "../utils/async-handler";
import type { LoginInput, RegisterInput } from "../validations/auth.validation";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../utils/auth-tokens";
import { clearAuthCookies, setAuthCookies } from "../utils/auth-cookies";
import { AppError } from "../utils/app-error";

export const register: RequestHandler = asyncHandler(
  async (request, response) => {
    const input = request.body as RegisterInput;

    const user = await registerUser(input);

    response.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user,
      },
    });
  },
);

export const login: RequestHandler = asyncHandler(async (request, response) => {
  const input = request.body as LoginInput;

  const user = await loginUser(input);
  const userId = user._id.toString();

  const accessToken = createAccessToken(userId);

  const refreshToken = createRefreshToken(userId);

  setAuthCookies(response, accessToken, refreshToken);

  response.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user,
    },
  });
});

export const me: RequestHandler = asyncHandler(async (request, response) => {
  const userId = request.auth?.userId;

  if (!userId) {
    throw new Error("Authenticated request is missing its user ID");
  }

  const user = await getCurrentUser(userId);

  response.status(200).json({
    success: true,
    message: "Current user retrieved successfully",
    data: {
      user,
    },
  });
});

export const refresh: RequestHandler = asyncHandler(
  async (request, response) => {
    const existingRefreshToken = request.cookies?.refreshToken as
      | string
      | undefined;

    if (!existingRefreshToken) {
      throw new AppError(
        "Refresh token is required",
        401,
        "REFRESH_TOKEN_REQUIRED",
      );
    }

    try {
      const payload = verifyRefreshToken(existingRefreshToken);

      /*
       * Confirm that the token still belongs to an
       * existing user.
       */
      const user = await getCurrentUser(payload.userId);

      const newAccessToken = createAccessToken(user._id.toString());

      const newRefreshToken = createRefreshToken(user._id.toString());

      /*
       * Rotate both cookies instead of continuing to
       * reuse the same refresh token.
       */
      setAuthCookies(response, newAccessToken, newRefreshToken);

      response.status(200).json({
        success: true,
        message: "Session refreshed successfully",
      });
    } catch {
      clearAuthCookies(response);

      throw new AppError(
        "Refresh token is invalid or has expired",
        401,
        "INVALID_REFRESH_TOKEN",
      );
    }
  },
);

export const logout: RequestHandler = asyncHandler(
  async (_request, response) => {
    clearAuthCookies(response);

    response.status(200).json({
      success: true,
      message: "Logout successful",
    });
  },
);
