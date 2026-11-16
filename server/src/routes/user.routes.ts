import { Router } from "express";

import {
  deleteMyAvatar,
  getMyProfile,
  getPublicProfile,
  search,
  updateMyAvatar,
  updateMyProfile,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { uploadAvatarImage } from "../middleware/avatar-upload.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { updateProfileSchema } from "../validations/profile.validation";

const userRouter = Router();

userRouter.get("/search", authenticate, search);

userRouter.get("/me", authenticate, getMyProfile);

userRouter.patch(
  "/me",
  authenticate,
  validateBody(updateProfileSchema),
  updateMyProfile,
);

userRouter.patch("/me/avatar", authenticate, uploadAvatarImage, updateMyAvatar);

userRouter.delete("/me/avatar", authenticate, deleteMyAvatar);
userRouter.get("/:userId/profile", authenticate, getPublicProfile);

export default userRouter;
