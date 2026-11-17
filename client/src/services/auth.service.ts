import { apiClient } from "@/lib/api/client";

import type { ApiSuccessResponse } from "@/types/api";

import type {
  AuthUser,
  AuthUserData,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "@/types/auth";

type AuthResponse = ApiSuccessResponse<AuthUserData>;

export const registerUser = async (input: RegisterInput): Promise<AuthUser> => {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", input);

  return data.data.user;
};

export const loginUser = async (input: LoginInput): Promise<AuthUser> => {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", input);

  return data.data.user;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<AuthResponse>("/auth/me");

  return data.data.user;
};

export const logoutUser = async (): Promise<void> => {
  await apiClient.post("/auth/logout");
};

interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export const changeUserPassword = async (
  input: ChangePasswordInput,
): Promise<string> => {
  const { data } = await apiClient.patch<ChangePasswordResponse>(
    "/auth/change-password",
    input,
  );

  return data.message;
};
