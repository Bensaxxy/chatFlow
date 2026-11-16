import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });

    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      ...(error.details !== undefined && {
        details: error.details,
      }),
    });

    return;
  }

  console.error("Unexpected server error:", error);

  response.status(500).json({
    success: false,
    message:
      env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : error instanceof Error
          ? error.message
          : "An unexpected error occurred",
    code: "INTERNAL_SERVER_ERROR",
  });
};
