import axios from "axios";

import { API_URL } from "@/lib/api/config";
import { apiClient } from "@/lib/api/client";
import { getMobileDeviceIdentity } from "@/lib/auth/device";
import {
  clearMobileTokens,
  getRefreshToken,
  saveMobileTokens,
} from "@/lib/auth/token-store";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  AuthUser,
  LoginInput,
  MobileAuthData,
  RegisterInput,
  VerifyEmailInput,
} from "@/types/auth";

interface UserData {
  user: AuthUser;
}

interface MessageData {
  message: string;
}

export const loginMobileUser = async (input: LoginInput): Promise<AuthUser> => {
  const device = await getMobileDeviceIdentity();

  const { data } = await apiClient.post<ApiSuccessResponse<MobileAuthData>>(
    "/auth/mobile/login",
    {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
    },
  );

  await saveMobileTokens(data.data.accessToken, data.data.refreshToken);

  return data.data.user;
};

export const registerMobileUser = async (
  input: RegisterInput,
): Promise<AuthUser> => {
  const { data } = await apiClient.post<ApiSuccessResponse<UserData>>(
    "/auth/register",
    {
      ...input,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
    },
  );

  return data.data.user;
};

export const verifyMobileEmail = async (
  input: VerifyEmailInput,
): Promise<AuthUser> => {
  const { data } = await apiClient.post<ApiSuccessResponse<UserData>>(
    "/auth/verify-email",
    {
      email: input.email.trim().toLowerCase(),
      code: input.code.trim(),
    },
  );

  return data.data.user;
};

export const resendMobileVerificationCode = async (
  email: string,
): Promise<string> => {
  const { data } = await apiClient.post<MessageData>(
    "/auth/resend-verification",
    { email: email.trim().toLowerCase() },
  );

  return data.message;
};

export const requestMobilePasswordReset = async (
  email: string,
): Promise<string> => {
  const { data } = await apiClient.post<MessageData>(
    "/auth/forgot-password",
    { email: email.trim().toLowerCase() },
  );

  return data.message;
};

export const logoutMobileUser = async (): Promise<void> => {
  const refreshToken = await getRefreshToken();

  try {
    if (refreshToken) {
      await axios.post(
        `${API_URL}/auth/mobile/logout`,
        {
          refreshToken,
        },
        {
          timeout: 20_000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );
    }
  } finally {
    await clearMobileTokens();
  }
};
