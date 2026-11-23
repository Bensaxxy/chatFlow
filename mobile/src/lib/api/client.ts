import { create, isAxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_URL } from "@/lib/api/config";
import { restoreMobileSession } from "@/lib/auth/mobile-session";
import { clearMobileTokens, getAccessToken } from "@/lib/auth/token-store";
import type { ApiErrorResponse } from "@/types/api";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = create({
  baseURL: API_URL,
  timeout: 20_000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string> | null = null;

let authenticationFailureHandler: (() => void) | null = null;

export const setAuthenticationFailureHandler = (
  handler: (() => void) | null,
): void => {
  authenticationFailureHandler = handler;
};

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,

  async (error: unknown) => {
    if (!isAxiosError<ApiErrorResponse>(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;

    const errorCode = error.response?.data?.code;

    if (
      error.response?.status === 401 &&
      errorCode === "ACCESS_TOKEN_EXPIRED" &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = restoreMobileSession().then((session) => {
            if (!session) {
              throw new Error("No mobile session exists");
            }

            return session.accessToken;
          });
        }

        await refreshPromise;

        return apiClient(originalRequest);
      } catch (refreshError) {
        await clearMobileTokens();
        authenticationFailureHandler?.();

        return Promise.reject(refreshError);
      } finally {
        refreshPromise = null;
      }
    }

    if (
      error.response?.status === 401 &&
      (errorCode === "SESSION_EXPIRED" || errorCode === "INVALID_ACCESS_TOKEN")
    ) {
      await clearMobileTokens();
      authenticationFailureHandler?.();
    }

    return Promise.reject(error);
  },
);
