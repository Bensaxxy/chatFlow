import { isAxiosError } from "axios";

import type { ApiErrorResponse } from "@/types/api";

export const getApiErrorMessage = (error: unknown): string => {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message || error.message || "Request failed";
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
