import { apiClient } from "@/lib/api/client";

import type { ApiSuccessResponse } from "@/types/api";

import type {
  AuthUser,
  AuthUserData,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@/types/auth";

type AuthResponse = ApiSuccessResponse<AuthUserData>;

interface MessageResponse {
  success: boolean;
  message: string;
}

export const registerUser = async (input: RegisterInput): Promise<AuthUser> => {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", input);

  return data.data.user;
};

export const loginUser = async (input: LoginInput): Promise<AuthUser> => {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", input);

  return data.data.user;
};

export const verifyEmailAddress = async (
  input: VerifyEmailInput,
): Promise<AuthUser> => {
  const { data } = await apiClient.post<AuthResponse>(
    "/auth/verify-email",
    input,
  );

  return data.data.user;
};

export const resendEmailVerificationCode = async (
  input: ResendVerificationInput,
): Promise<string> => {
  const { data } = await apiClient.post<MessageResponse>(
    "/auth/resend-verification",
    input,
  );

  return data.message;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<AuthResponse>("/auth/me");

  return data.data.user;
};

export const logoutUser = async (): Promise<void> => {
  await apiClient.post("/auth/logout");
};

export const changeUserPassword = async (
  input: ChangePasswordInput,
): Promise<string> => {
  const { data } = await apiClient.patch<MessageResponse>(
    "/auth/change-password",
    input,
  );

  return data.message;
};

export const requestPasswordReset = async (
  input: RequestPasswordResetInput,
): Promise<string> => {
  const { data } = await apiClient.post<MessageResponse>(
    "/auth/forgot-password",
    input,
  );

  return data.message;
};

export const resetPassword = async (
  input: ResetPasswordInput,
): Promise<string> => {
  const { data } = await apiClient.post<MessageResponse>(
    "/auth/reset-password",
    input,
  );

  return data.message;
};
