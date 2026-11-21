import * as webpush from "web-push";
import type { PushSubscription as WebPushSubscription } from "web-push";

import { env } from "../config/env";
import { PushSubscription } from "../models/push-subscription.model";
import { User } from "../models/user.model";
import type {
  PushSubscriptionInput,
  RemovePushSubscriptionInput,
} from "../validations/push-notification.validation";

const isPushConfigured = Boolean(
  env.VAPID_SUBJECT && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY,
);

if (isPushConfigured) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT as string,
    env.VAPID_PUBLIC_KEY as string,
    env.VAPID_PRIVATE_KEY as string,
  );
}

interface MessagePushNotificationInput {
  recipientIds: string[];
  conversationId: string;
  messageId: string;
  senderName: string;
  content: string;
  messageType: "text" | "image" | "file" | "audio";
}

const getMessagePreview = (
  content: string,
  messageType: MessagePushNotificationInput["messageType"],
): string => {
  const normalizedContent = content.replace(/\s+/g, " ").trim();

  if (messageType === "image") {
    return normalizedContent ? `Photo: ${normalizedContent}` : "Sent a photo";
  }

  if (messageType === "audio") {
    return normalizedContent
      ? `Voice note: ${normalizedContent}`
      : "Sent a voice note";
  }

  if (messageType === "file") {
    return normalizedContent ? `File: ${normalizedContent}` : "Sent a file";
  }

  return normalizedContent || "Sent you a message";
};

const isExpiredSubscriptionError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const statusCode = "statusCode" in error ? error.statusCode : undefined;

  return statusCode === 404 || statusCode === 410;
};

export const getPushNotificationConfiguration = () => ({
  enabled: isPushConfigured,
  publicKey: isPushConfigured ? env.VAPID_PUBLIC_KEY : null,
});

export const savePushSubscription = async (
  userId: string,
  subscription: PushSubscriptionInput,
) => {
  await PushSubscription.findOneAndUpdate(
    {
      endpoint: subscription.endpoint,
    },
    {
      $set: {
        user: userId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: subscription.keys,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
};

export const removePushSubscription = async (
  userId: string,
  input: RemovePushSubscriptionInput,
) => {
  await PushSubscription.deleteOne({
    user: userId,
    endpoint: input.endpoint,
  });
};

export const sendMessagePushNotifications = async ({
  recipientIds,
  conversationId,
  messageId,
  senderName,
  content,
  messageType,
}: MessagePushNotificationInput): Promise<void> => {
  if (!isPushConfigured || recipientIds.length === 0) {
    return;
  }

  const subscriptions = await PushSubscription.find({
    user: {
      $in: recipientIds,
    },
  }).lean();

  if (subscriptions.length === 0) {
    return;
  }

  const recipients = await User.find({
    _id: {
      $in: recipientIds,
    },
  })
    .select("notificationSettings")
    .lean();
  const vibrationByUserId = new Map(
    recipients.map((recipient) => [
      recipient._id.toString(),
      recipient.notificationSettings?.vibration !== false,
    ]),
  );

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const keys = subscription.keys;

      if (!keys?.p256dh || !keys.auth) {
        await PushSubscription.deleteOne({
          _id: subscription._id,
        });

        return;
      }

      const webPushSubscription: WebPushSubscription = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      };

      const payload = JSON.stringify({
        title: senderName,
        body: getMessagePreview(content, messageType).slice(0, 240),
        tag: `chatflow-message-${conversationId}`,
        url: `${env.CLIENT_URL}/chats/${conversationId}`,
        conversationId,
        messageId,
        vibrate: vibrationByUserId.get(subscription.user.toString()) !== false,
      });

      try {
        await webpush.sendNotification(webPushSubscription, payload, {
          TTL: 60 * 60 * 24,
          urgency: "high",
        });
      } catch (error) {
        if (isExpiredSubscriptionError(error)) {
          await PushSubscription.deleteOne({
            _id: subscription._id,
          });

          return;
        }

        console.error("Could not send a push notification:", error);
      }
    }),
  );
};
