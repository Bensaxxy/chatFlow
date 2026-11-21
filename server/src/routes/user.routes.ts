import { Router } from "express";

import {
  block,
  deleteMyAvatar,
  getMyProfile,
  getPublicProfile,
  search,
  unblock,
  updateMyAvatar,
  updateMyChatTheme,
  updateMyProfile,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { uploadAvatarImage } from "../middleware/avatar-upload.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  updateChatThemeSchema,
  updateProfileSchema,
} from "../validations/profile.validation";

const userRouter = Router();

userRouter.get("/search", authenticate, search);

userRouter.get("/me", authenticate, getMyProfile);

userRouter.patch(
  "/me",
  authenticate,
  validateBody(updateProfileSchema),
  updateMyProfile,
);

userRouter.patch(
  "/me/chat-theme",
  authenticate,
  validateBody(updateChatThemeSchema),
  updateMyChatTheme,
);

userRouter.patch("/me/avatar", authenticate, uploadAvatarImage, updateMyAvatar);

userRouter.delete("/me/avatar", authenticate, deleteMyAvatar);
userRouter.put("/:userId/block", authenticate, block);
userRouter.delete("/:userId/block", authenticate, unblock);
userRouter.get("/:userId/profile", authenticate, getPublicProfile);

export default userRouter;
