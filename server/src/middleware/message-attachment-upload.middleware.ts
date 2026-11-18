import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";

import { AppError } from "../utils/app-error";

const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;

const allowedAttachmentTypes = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",

  // Documents
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Spreadsheets
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Presentations
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Archives
  "application/zip",
  "application/x-zip-compressed",
]);

const messageAttachmentUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_ATTACHMENT_SIZE,
    files: 1,
  },

  fileFilter: (_request, file, callback) => {
    if (!allowedAttachmentTypes.has(file.mimetype)) {
      callback(
        new AppError(
          "This file type is not supported",
          400,
          "INVALID_ATTACHMENT_TYPE",
        ),
      );

      return;
    }

    callback(null, true);
  },
}).single("attachment");

export const uploadMessageAttachment: RequestHandler = (
  request,
  response,
  next,
) => {
  messageAttachmentUpload(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new AppError(
            "The attachment cannot exceed 15 MB",
            400,
            "ATTACHMENT_TOO_LARGE",
          ),
        );

        return;
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        next(
          new AppError(
            "Only one attachment can be sent at a time",
            400,
            "TOO_MANY_ATTACHMENTS",
          ),
        );

        return;
      }

      next(
        new AppError(
          "The attachment could not be processed",
          400,
          "ATTACHMENT_UPLOAD_ERROR",
        ),
      );

      return;
    }

    next(error);
  });
};