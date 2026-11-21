import type { RequestHandler } from "express";

import {
  getPushNotificationConfiguration,
  removePushSubscription,
  savePushSubscription,
} from "../services/push-notification.service";
import { asyncHandler } from "../utils/async-handler";
import type {
  PushSubscriptionInput,
  RemovePushSubscriptionInput,
} from "../validations/push-notification.validation";

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new Error("Authenticated request is missing its user ID");
  }

  return userId;
};

export const getPushConfiguration: RequestHandler = (_request, response) => {
  response.status(200).json({
    success: true,
    data: getPushNotificationConfiguration(),
  });
};

export const subscribeToPushNotifications: RequestHandler = asyncHandler(
  async (request, response) => {
    const userId = getAuthenticatedUserId(request.auth?.userId);

    await savePushSubscription(userId, request.body as PushSubscriptionInput);

    response.status(201).json({
      success: true,
      message: "Push notifications enabled",
    });
  },
);

export const unsubscribeFromPushNotifications: RequestHandler = asyncHandler(
  async (request, response) => {
    const userId = getAuthenticatedUserId(request.auth?.userId);

    await removePushSubscription(
      userId,
      request.body as RemovePushSubscriptionInput,
    );

    response.status(200).json({
      success: true,
      message: "Push notifications disabled",
    });
  },
);
