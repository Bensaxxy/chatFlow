import { Router } from "express";

import {
  acceptRequest,
  cancelRequest,
  createFriendRequest,
  declineRequest,
  deleteFriend,
  discoverFriends,
  listFriendRequests,
  listFriends,
} from "../controllers/friend.controller";
import { authenticate } from "../middleware/auth.middleware";

const friendRouter = Router();

friendRouter.use(authenticate);

friendRouter.get("/discover", discoverFriends);

friendRouter.get("/", listFriends);

friendRouter.get("/requests", listFriendRequests);

friendRouter.post("/requests/:userId", createFriendRequest);

friendRouter.patch("/requests/:friendshipId/accept", acceptRequest);

friendRouter.delete("/requests/:friendshipId/decline", declineRequest);

friendRouter.delete("/requests/:friendshipId/cancel", cancelRequest);

friendRouter.delete("/:friendshipId", deleteFriend);

export default friendRouter;
