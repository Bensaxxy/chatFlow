import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";
import { extname } from "node:path";

import { AppError } from "../utils/app-error";

const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;

const allowedAttachmentTypes = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",

  // Voice notes and audio attachments
  "audio/aac",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",

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

const allowedAttachmentExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".aac",
  ".m4a",
  ".mp3",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
  ".pdf",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
]);

const isAllowedAttachment = (file: Express.Multer.File): boolean => {
  const mimeType = file.mimetype.split(";")[0]?.trim().toLowerCase() ?? "";

  if (allowedAttachmentTypes.has(mimeType)) {
    return true;
  }

  /*
   * Desktop browsers sometimes provide an empty MIME type or
   * application/octet-stream for otherwise valid documents. Accept those
   * only when their extension is on the same allow-list as the client.
   */
  if (
    mimeType &&
    mimeType !== "application/octet-stream"
  ) {
    return false;
  }

  return allowedAttachmentExtensions.has(extname(file.originalname).toLowerCase());
};

const messageAttachmentUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_ATTACHMENT_SIZE,
    files: 1,
  },

  fileFilter: (_request, file, callback) => {
    if (!isAllowedAttachment(file)) {
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
