import { Router } from "express";

import {
  changePassword,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resendVerificationCode,
  resetPassword,
  socketToken,
  verifyEmail,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  changePasswordSchema,
  requestPasswordResetSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validations/auth.validation";

const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), register);

authRouter.post("/verify-email", validateBody(verifyEmailSchema), verifyEmail);

authRouter.post(
  "/resend-verification",
  validateBody(resendVerificationSchema),
  resendVerificationCode,
);

authRouter.post("/login", validateBody(loginSchema), login);

authRouter.post(
  "/forgot-password",
  validateBody(requestPasswordResetSchema),
  forgotPassword,
);

authRouter.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  resetPassword,
);

authRouter.post("/refresh", refresh);

authRouter.post("/logout", logout);

authRouter.get("/me", authenticate, me);

authRouter.post("/socket-token", authenticate, socketToken);

authRouter.patch(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  changePassword,
);

export default authRouter;
