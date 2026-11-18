import { Router } from "express";

import {
  changePassword,
  login,
  logout,
  me,
  refresh,
  register,
  socketToken,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "../validations/auth.validation";

const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), register);

authRouter.post("/login", validateBody(loginSchema), login);

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
