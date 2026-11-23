import { Router } from "express";

import {
  createPhoto,
  createText,
  getStatus,
  listStatuses,
  listStatusViewers,
  reactToStatus,
  removeStatus,
  viewStatus,
} from "../controllers/status.controller";
import { authenticate } from "../middleware/auth.middleware";
import { uploadStatusPhoto } from "../middleware/status-upload.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  createTextStatusSchema,
  updateStatusReactionSchema,
} from "../validations/status.validation";

const statusRouter = Router();

statusRouter.use(authenticate);

statusRouter.get("/", listStatuses);

statusRouter.post("/text", validateBody(createTextStatusSchema), createText);

statusRouter.post("/photo", uploadStatusPhoto, createPhoto);

statusRouter.get("/:statusId/viewers", listStatusViewers);

statusRouter.post("/:statusId/view", viewStatus);

statusRouter.patch(
  "/:statusId/reaction",
  validateBody(updateStatusReactionSchema),
  reactToStatus,
);

statusRouter.get("/:statusId", getStatus);

statusRouter.delete("/:statusId", removeStatus);

export default statusRouter;
