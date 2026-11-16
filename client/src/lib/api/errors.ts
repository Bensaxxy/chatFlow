import axios from "axios";

import type { ApiErrorResponse, ApiValidationIssue } from "@/types/api";

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return (
      error.response?.data?.message ??
      error.message ??
      "The request could not be completed"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
};

export const getApiValidationErrors = (
  error: unknown,
): ApiValidationIssue[] => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.errors ?? [];
  }

  return [];
};
