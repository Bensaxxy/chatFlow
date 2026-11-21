import { env } from "../config/env";
import { User } from "../models/user.model";
import { sendMessageNotificationEmail } from "./email.service";

const MESSAGE_EMAIL_COOLDOWN_MS = 5 * 60 * 1000;

interface SendMessageEmailNotificationsInput {
  recipientIds: string[];
  conversationId: string;
  senderName: string;
}

export const sendMessageEmailNotifications = async ({
  recipientIds,
  conversationId,
  senderName,
}: SendMessageEmailNotificationsInput): Promise<void> => {
  if (recipientIds.length === 0) {
    return;
  }

  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - MESSAGE_EMAIL_COOLDOWN_MS);
  const recipients = await User.find({
    _id: {
      $in: recipientIds,
    },
    "notificationSettings.emailNotifications": {
      $ne: false,
    },
    $or: [
      {
        lastMessageEmailNotificationAt: null,
      },
      {
        lastMessageEmailNotificationAt: {
          $lt: cooldownCutoff,
        },
      },
    ],
  }).select("name email +lastMessageEmailNotificationAt");

  if (recipients.length === 0) {
    return;
  }

  const conversationUrl = new URL(
    `/chats/${conversationId}`,
    env.CLIENT_URL,
  ).toString();

  await Promise.all(
    recipients.map(async (recipient) => {
      await User.updateOne(
        {
          _id: recipient._id,
        },
        {
          $set: {
            lastMessageEmailNotificationAt: now,
          },
        },
      );

      try {
        await sendMessageNotificationEmail({
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          senderName,
          conversationUrl,
        });
      } catch (error) {
        console.error("Could not send a message notification email:", error);
      }
    }),
  );
};
