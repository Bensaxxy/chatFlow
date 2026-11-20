import { Router } from "express";

import { getCallIceServers } from "../controllers/call.controller";
import { listCallHistory } from "../controllers/call-history.controller";
import { authenticate } from "../middleware/auth.middleware";

const callRouter = Router();

callRouter.get("/ice-servers", authenticate, getCallIceServers);
callRouter.get("/history", authenticate, listCallHistory);

export default callRouter;
