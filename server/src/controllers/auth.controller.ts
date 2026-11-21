import type { RequestHandler } from "express";

import {
  changeUserPassword,
  getCurrentUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resendUserVerificationCode,
  resetUserPassword,
  verifyUserEmail,
} from "../services/auth.service";
import { AppError } from "../utils/app-error";
import { clearAuthCookies, setAuthCookies } from "../utils/auth-cookies";
import {
  createAccessToken,
  createRefreshToken,
  createSocketToken,
  verifyRefreshToken,
} from "../utils/auth-tokens";
import { asyncHandler } from "../utils/async-handler";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "../validations/auth.validation";

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new Error("Authenticated request is missing its user ID");
  }

  return userId;
};

export const register: RequestHandler = asyncHandler(
  async (request, response) => {
    const input = request.body as RegisterInput;

    const user = await registerUser(input);

    response.status(201).json({
      success: true,
      message: "Account created successfully. Check your email for the verification code.",
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

  const accessToken = createAccessToken(userId, user.sessionVersion);

  const refreshToken = createRefreshToken(userId, user.sessionVersion);

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
  const userId = getAuthenticatedUserId(request.auth?.userId);

  const user = await getCurrentUser(userId);

  response.status(200).json({
    success: true,
    message: "Current user retrieved successfully",
    data: {
      user,
    },
  });
});

export const socketToken: RequestHandler = asyncHandler(
  async (request, response) => {
    const userId = getAuthenticatedUserId(request.auth?.userId);
    const sessionVersion = request.auth?.sessionVersion;

    if (sessionVersion === undefined) {
      throw new Error("Authenticated request is missing its session version");
    }

    response.status(200).json({
      success: true,
      message: "Socket token created successfully",
      data: {
        token: createSocketToken(userId, sessionVersion),
      },
    });
  },
);

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

      const user = await getCurrentUser(payload.userId);

      if (user.sessionVersion !== payload.sessionVersion) {
        throw new Error("Session has been invalidated");
      }

      const newAccessToken = createAccessToken(
        user._id.toString(),
        user.sessionVersion,
      );

      const newRefreshToken = createRefreshToken(
        user._id.toString(),
        user.sessionVersion,
      );

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

export const changePassword: RequestHandler = asyncHandler(
  async (request, response) => {
    const userId = getAuthenticatedUserId(request.auth?.userId);

    const input = request.body as ChangePasswordInput;

    await changeUserPassword(userId, input);

    clearAuthCookies(response);

    response.status(200).json({
      success: true,
      message:
        "Password changed successfully. Sign in again with your new password.",
    });
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

export const verifyEmail: RequestHandler = asyncHandler(
  async (request, response) => {
    const input = request.body as VerifyEmailInput;

    const user = await verifyUserEmail(input);

    response.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
      data: {
        user,
      },
    });
  },
);

export const resendVerificationCode: RequestHandler = asyncHandler(
  async (request, response) => {
    const input = request.body as ResendVerificationInput;

    await resendUserVerificationCode(input);

    response.status(200).json({
      success: true,
      message:
        "If an unverified account exists for that email, a new verification code has been sent.",
    });
  },
);

export const forgotPassword: RequestHandler = asyncHandler(
  async (request, response) => {
    const input = request.body as RequestPasswordResetInput;

    await requestPasswordReset(input);

    response.status(200).json({
      success: true,
      message:
        "If an account exists for that email address, a password reset link has been sent.",
    });
  },
);

export const resetPassword: RequestHandler = asyncHandler(
  async (request, response) => {
    const input = request.body as ResetPasswordInput;

    await resetUserPassword(input);
    clearAuthCookies(response);

    response.status(200).json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    });
  },
);
