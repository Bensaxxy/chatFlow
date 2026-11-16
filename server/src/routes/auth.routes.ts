import { Router } from "express";

import {
  login,
  logout,
  me,
  refresh,
  register,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { loginSchema, registerSchema } from "../validations/auth.validation";
import { authenticate } from "../middleware/auth.middleware";

const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), register);
authRouter.post("/login", validateBody(loginSchema), login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", authenticate, me);

export default authRouter;
