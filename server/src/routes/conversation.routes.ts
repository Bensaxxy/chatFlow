import { Router } from "express";

import {
  clearConversation,
  createDirect,
  getConversation,
  listConversations,
  markConversationUnread,
  updateConversationPin,
} from "../controllers/conversation.controller";
import {
  createAttachmentMessage,
  createMessage,
  forwardExistingMessage,
  getMessageContext,
  listConversationMedia,
  listMessages,
  markMessagesRead,
  reactToMessage,
  removeMessage,
  updateMessage,
} from "../controllers/message.controller";
import { authenticate } from "../middleware/auth.middleware";
import { uploadMessageAttachment } from "../middleware/message-attachment-upload.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  createDirectConversationSchema,
  updateConversationPinSchema,
} from "../validations/conversation.validation";
import {
  deleteMessageSchema,
  editMessageSchema,
  forwardMessageSchema,
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
  "/:conversationId/pin",
  authenticate,
  validateBody(updateConversationPinSchema),
  updateConversationPin,
);

conversationRouter.patch(
  "/:conversationId/unread",
  authenticate,
  markConversationUnread,
);

conversationRouter.post(
  "/:conversationId/clear",
  authenticate,
  clearConversation,
);

conversationRouter.patch(
  "/:conversationId/read",
  authenticate,
  markMessagesRead,
);

conversationRouter.get("/:conversationId/messages", authenticate, listMessages);

conversationRouter.get(
  "/:conversationId/media",
  authenticate,
  listConversationMedia,
);

conversationRouter.get(
  "/:conversationId/messages/:messageId/context",
  authenticate,
  getMessageContext,
);

conversationRouter.post(
  "/:conversationId/messages",
  authenticate,
  validateBody(sendMessageSchema),
  createMessage,
);

conversationRouter.post(
  "/:conversationId/messages/attachment",
  authenticate,
  uploadMessageAttachment,
  createAttachmentMessage,
);

conversationRouter.post(
  "/:conversationId/messages/:messageId/forward",
  authenticate,
  validateBody(forwardMessageSchema),
  forwardExistingMessage,
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
