import { Router } from "express";

import {
  createDirect,
  getConversation,
  listConversations,
} from "../controllers/conversation.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createDirectConversationSchema } from "../validations/conversation.validation";
import {
  createMessage,
  listMessages,
  markMessagesRead,
  reactToMessage,
  removeMessage,
  updateMessage,
} from "../controllers/message.controller";
import {
  deleteMessageSchema,
  editMessageSchema,
  sendMessageSchema,
  updateMessageReactionSchema,
} from "../validations/message.validation";

const conversationRouter = Router();

conversationRouter.get("/", authenticate, listConversations);

conversationRouter.post(
  "/direct",
  authenticate,
  validateBody(createDirectConversationSchema),
  createDirect,
);

conversationRouter.get("/:conversationId", authenticate, getConversation);

conversationRouter.patch(
  "/:conversationId/read",
  authenticate,
  markMessagesRead,
);

conversationRouter.get("/:conversationId/messages", authenticate, listMessages);
conversationRouter.post(
  "/:conversationId/messages",
  authenticate,
  validateBody(sendMessageSchema),
  createMessage,
);

conversationRouter.patch(
  "/:conversationId/messages/:messageId",
  authenticate,
  validateBody(editMessageSchema),
  updateMessage,
);

conversationRouter.patch(
  "/:conversationId/messages/:messageId/reaction",
  authenticate,
  validateBody(updateMessageReactionSchema),
  reactToMessage,
);

conversationRouter.delete(
  "/:conversationId/messages/:messageId",
  authenticate,
  validateBody(deleteMessageSchema),
  removeMessage,
);

export default conversationRouter;
