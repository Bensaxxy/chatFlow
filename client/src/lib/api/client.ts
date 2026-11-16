import axios, { type InternalAxiosRequestConfig } from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is missing from .env.local");
}

export const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  timeout: 15_000,

  headers: {
    Accept: "application/json",
  },
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/*
 * If multiple requests fail with 401 simultaneously,
 * they will share one refresh request.
 */
let refreshRequest: Promise<void> | null = null;

const refreshAuthentication = async (): Promise<void> => {
  if (!refreshRequest) {
    refreshRequest = apiClient
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

apiClient.interceptors.response.use(
  (response) => response,

  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? "";

    const shouldSkipRefresh = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
      "/auth/logout",
    ].some((path) => requestUrl.endsWith(path));

    const shouldRefresh =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !shouldSkipRefresh;

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshAuthentication();

      return apiClient(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);
