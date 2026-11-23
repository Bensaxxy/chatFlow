import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";

import { AppError } from "../utils/app-error";

const MAX_STATUS_PHOTO_SIZE = 10 * 1024 * 1024;

const allowedStatusPhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const statusPhotoUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_STATUS_PHOTO_SIZE,
    files: 1,
  },

  fileFilter: (_request, file, callback) => {
    if (!allowedStatusPhotoTypes.has(file.mimetype)) {
      callback(
        new AppError(
          "Status photos must be JPEG, PNG, or WebP images",
          400,
          "INVALID_STATUS_PHOTO_TYPE",
        ),
      );

      return;
    }

    callback(null, true);
  },
}).single("photo");

export const uploadStatusPhoto: RequestHandler = (request, response, next) => {
  statusPhotoUpload(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new AppError(
            "Status photo cannot exceed 10 MB",
            400,
            "STATUS_PHOTO_TOO_LARGE",
          ),
        );

        return;
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        next(
          new AppError(
            'Upload the status image using the "photo" field',
            400,
            "INVALID_STATUS_PHOTO_FIELD",
          ),
        );

        return;
      }

      next(
        new AppError(
          "The status photo could not be processed",
          400,
          "STATUS_PHOTO_UPLOAD_ERROR",
        ),
      );

      return;
    }

    next(error);
  });
};
