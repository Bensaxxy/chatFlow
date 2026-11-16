import { apiClient } from "@/lib/api/client";

import type { ApiSuccessResponse } from "@/types/api";

import type {
  AuthUser,
  AuthUserData,
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
