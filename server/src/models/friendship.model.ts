import { model, Schema, Types, type InferSchemaType } from "mongoose";

export const FRIENDSHIP_STATUSES = ["pending", "accepted"] as const;

const friendshipSchema = new Schema(
  {
    /**
     * Both users participating in the friendship. The IDs are always
     * stored in sorted order when the relationship is created.
     */
    users: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],

      required: true,

      validate: {
        validator: (userIds: Types.ObjectId[]): boolean => {
          if (userIds.length !== 2) {
            return false;
          }

          return userIds[0]?.toString() !== userIds[1]?.toString();
        },

        message: "A friendship must contain two different users",
      },
    },

    /**
     * A deterministic combination of both sorted user IDs prevents
     * duplicate requests and duplicate friendships.
     */
    pairKey: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: FRIENDSHIP_STATUSES,
      default: "pending",
      required: true,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

friendshipSchema.index({
  users: 1,
  status: 1,
  updatedAt: -1,
});

friendshipSchema.index({
  requestedBy: 1,
  status: 1,
  createdAt: -1,
});

friendshipSchema.index({
  status: 1,
  createdAt: -1,
});

friendshipSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    const safeObject = returnedObject as Record<string, unknown>;

    delete safeObject.pairKey;
    delete safeObject.__v;

    return safeObject;
  },
});

export type FriendshipDocument = InferSchemaType<typeof friendshipSchema>;

export const Friendship = model("Friendship", friendshipSchema);
