import { Router } from "express";

import {
  getPushConfiguration,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "../controllers/push-notification.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  pushSubscriptionSchema,
  removePushSubscriptionSchema,
} from "../validations/push-notification.validation";

const pushNotificationRouter = Router();

pushNotificationRouter.get("/config", getPushConfiguration);

pushNotificationRouter.post(
  "/subscriptions",
  authenticate,
  validateBody(pushSubscriptionSchema),
  subscribeToPushNotifications,
);

pushNotificationRouter.delete(
  "/subscriptions",
  authenticate,
  validateBody(removePushSubscriptionSchema),
  unsubscribeFromPushNotifications,
);

export default pushNotificationRouter;
