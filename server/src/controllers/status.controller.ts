import type { RequestHandler } from "express";

import {
  createPhotoStatus,
  createTextStatus,
  deleteStatus,
  getStatusFeed,
  getStatusForViewer,
  getStatusViewers,
  markStatusViewed,
  updateStatusReaction,
} from "../services/status.service";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import {
  createPhotoStatusSchema,
  createTextStatusSchema,
  statusParamsSchema,
  updateStatusReactionSchema,
} from "../validations/status.validation";

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new Error("Authenticated request is missing its user ID");
  }

  return userId;
};

/**
 * Multipart form values arrive as strings. Audience user IDs are sent
 * by the frontend using JSON.stringify([...userIds]).
 */
const parseMultipartStringArray = (
  value: unknown,
  fieldName: string,
): string[] => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value !== "string") {
    throw new AppError(
      `${fieldName} must be an array of user IDs`,
      400,
      "INVALID_STATUS_AUDIENCE",
    );
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (!Array.isArray(parsedValue)) {
      throw new Error("Value is not an array");
    }

    return parsedValue.map(String);
  } catch {
    throw new AppError(
      `${fieldName} must be a valid JSON array`,
      400,
      "INVALID_STATUS_AUDIENCE",
    );
  }
};

export const createText: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const input = createTextStatusSchema.parse(request.body);

    const status = await createTextStatus(currentUserId, input);

    response.status(201).json({
      success: true,
      message: "Text status created successfully",
      data: {
        status,
      },
    });
  },
);

export const createPhoto: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    if (!request.file) {
      throw new AppError(
        "Select a photo to create this status",
        400,
        "STATUS_PHOTO_REQUIRED",
      );
    }

    const input = createPhotoStatusSchema.parse({
      caption: request.body.caption,
      audience: request.body.audience,

      selectedUserIds: parseMultipartStringArray(
        request.body.selectedUserIds,
        "selectedUserIds",
      ),

      excludedUserIds: parseMultipartStringArray(
        request.body.excludedUserIds,
        "excludedUserIds",
      ),
    });

    const status = await createPhotoStatus(currentUserId, input, request.file);

    response.status(201).json({
      success: true,
      message: "Photo status created successfully",
      data: {
        status,
      },
    });
  },
);

export const listStatuses: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const statuses = await getStatusFeed(currentUserId);

    response.status(200).json({
      success: true,
      message: "Statuses retrieved successfully",
      data: {
        statuses,
      },
    });
  },
);

export const getStatus: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { statusId } = statusParamsSchema.parse(request.params);

    const status = await getStatusForViewer(statusId, currentUserId);

    response.status(200).json({
      success: true,
      message: "Status retrieved successfully",
      data: {
        status,
      },
    });
  },
);

export const viewStatus: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { statusId } = statusParamsSchema.parse(request.params);

    const status = await markStatusViewed(statusId, currentUserId);

    response.status(200).json({
      success: true,
      message: "Status marked as viewed",
      data: {
        status,
      },
    });
  },
);

export const reactToStatus: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { statusId } = statusParamsSchema.parse(request.params);

    const input = updateStatusReactionSchema.parse(request.body);

    const status = await updateStatusReaction(statusId, currentUserId, input);

    response.status(200).json({
      success: true,
      message: input.emoji
        ? "Status reaction updated"
        : "Status reaction removed",
      data: {
        status,
      },
    });
  },
);

export const listStatusViewers: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { statusId } = statusParamsSchema.parse(request.params);

    const viewers = await getStatusViewers(statusId, currentUserId);

    response.status(200).json({
      success: true,
      message: "Status viewers retrieved successfully",
      data: {
        viewers,
      },
    });
  },
);

export const removeStatus: RequestHandler = asyncHandler(
  async (request, response) => {
    const currentUserId = getAuthenticatedUserId(request.auth?.userId);

    const { statusId } = statusParamsSchema.parse(request.params);

    await deleteStatus(statusId, currentUserId);

    response.status(200).json({
      success: true,
      message: "Status deleted successfully",
    });
  },
);
