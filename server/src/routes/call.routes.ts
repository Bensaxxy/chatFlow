import { Router } from "express";

import { getCallIceServers } from "../controllers/call.controller";
import { authenticate } from "../middleware/auth.middleware";

const callRouter = Router();

callRouter.get("/ice-servers", authenticate, getCallIceServers);

export default callRouter;
