import { model, Schema, type InferSchemaType } from "mongoose";

const mobileSessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    deviceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    deviceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    sessionVersion: {
      type: Number,
      required: true,
      min: 0,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },

    previousRefreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

mobileSessionSchema.index(
  {
    user: 1,
    deviceId: 1,
  },
  {
    unique: true,
  },
);

/*
 * MongoDB automatically removes expired sessions.
 */
mobileSessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

mobileSessionSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    const safeObject = returnedObject as Record<string, unknown>;

    delete safeObject.refreshTokenHash;
    delete safeObject.previousRefreshTokenHash;
    delete safeObject.__v;

    return safeObject;
  },
});

export type MobileSessionDocument = InferSchemaType<typeof mobileSessionSchema>;

export const MobileSession = model("MobileSession", mobileSessionSchema);
