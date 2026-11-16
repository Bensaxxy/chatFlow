import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";

import { AppError } from "../utils/app-error";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (_request, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(
        new AppError(
          "Profile picture must be a JPEG, PNG, or WebP image",
          400,
          "INVALID_AVATAR_TYPE",
        ),
      );

      return;
    }

    callback(null, true);
  },
}).single("avatar");

export const uploadAvatarImage: RequestHandler = (request, response, next) => {
  avatarUpload(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new AppError(
            "Profile picture cannot exceed 5 MB",
            400,
            "AVATAR_TOO_LARGE",
          ),
        );

        return;
      }

      next(
        new AppError(
          "The profile picture could not be processed",
          400,
          "AVATAR_UPLOAD_ERROR",
        ),
      );

      return;
    }

    next(error);
  });
};
