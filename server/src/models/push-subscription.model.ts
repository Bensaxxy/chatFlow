import { model, Schema } from "mongoose";

const pushSubscriptionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    endpoint: {
      type: String,
      required: true,
      unique: true,
      maxlength: 2048,
    },

    expirationTime: {
      type: Number,
      default: null,
    },

    keys: {
      p256dh: {
        type: String,
        required: true,
      },

      auth: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

pushSubscriptionSchema.index({ user: 1, updatedAt: -1 });

export const PushSubscription = model(
  "PushSubscription",
  pushSubscriptionSchema,
);
