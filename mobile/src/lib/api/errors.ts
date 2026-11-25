import { isAxiosError } from "axios";

import type { ApiErrorResponse } from "@/types/api";

export const getApiErrorMessage = (error: unknown): string => {
  if (isAxiosError<ApiErrorResponse>(error)) {
    const responseMessage = error.response?.data?.message;
    const normalizedMessage = responseMessage?.toLowerCase() ?? "";

    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      normalizedMessage.includes("timeout of") ||
      normalizedMessage.includes("timed out")
    ) {
      return "ChatFlow is taking longer than usual to respond. Check your connection and try again.";
    }

    if (error.code === "ERR_NETWORK" || (!error.response && error.message === "Network Error")) {
      return "We couldn’t reach ChatFlow. Check your internet connection and try again.";
    }

    return responseMessage || error.message || "Request failed";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
};

export const getApiErrorCode = (error: unknown): string | undefined => {
  if (!isAxiosError<ApiErrorResponse>(error)) {
    return undefined;
  }

  return error.response?.data?.code;
};
