import { model, Schema, type InferSchemaType } from "mongoose";

const chatThemeSchema = new Schema(
  {
    appearance: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },

    wallpaper: {
      type: String,
      enum: ["paper", "aurora", "midnight", "blush", "mesh"],
      default: "paper",
    },

    bubbleColor: {
      type: String,
      enum: ["cyan", "violet", "emerald", "rose", "amber"],
      default: "cyan",
    },
  },
  {
    _id: false,
  },
);

const privacySettingsSchema = new Schema(
  {
    profilePhotoVisibility: {
      type: String,
      enum: ["everyone", "nobody"],
      default: "everyone",
    },

    lastSeenVisibility: {
      type: String,
      enum: ["everyone", "nobody"],
      default: "everyone",
    },

    readReceipts: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  },
);

const notificationSettingsSchema = new Schema(
  {
    emailNotifications: {
      type: Boolean,
      default: true,
    },

    messageSound: {
      type: String,
      enum: ["chime", "pulse", "pop", "none"],
      default: "chime",
    },

    vibration: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  },
);

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [60, "Name cannot exceed 60 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, "Email address is too long"],
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false,
    },

    /* Incremented after password changes to invalidate every older session. */
    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    emailVerificationCodeHash: {
      type: String,
      select: false,
      default: null,
    },

    emailVerificationExpiresAt: {
      type: Date,
      select: false,
      default: null,
    },

    emailVerificationSentAt: {
      type: Date,
      select: false,
      default: null,
    },

    emailVerificationAttempts: {
      type: Number,
      select: false,
      default: 0,
      min: 0,
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    avatarPublicId: {
      type: String,
      default: null,
      select: false,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [160, "Bio cannot exceed 160 characters"],
      default: "",
    },

    chatTheme: {
      type: chatThemeSchema,
      default: () => ({}),
    },

    privacySettings: {
      type: privacySettingsSchema,
      default: () => ({}),
    },

    notificationSettings: {
      type: notificationSettingsSchema,
      default: () => ({}),
    },

    lastMessageEmailNotificationAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },

    blockedUsers: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    const safeObject = returnedObject as Record<string, unknown>;

    delete safeObject.passwordHash;
    delete safeObject.sessionVersion;
    delete safeObject.avatarPublicId;
    delete safeObject.blockedUsers;
    delete safeObject.emailVerificationCodeHash;
    delete safeObject.emailVerificationExpiresAt;
    delete safeObject.emailVerificationSentAt;
    delete safeObject.emailVerificationAttempts;
    delete safeObject.lastMessageEmailNotificationAt;
    delete safeObject.passwordResetTokenHash;
    delete safeObject.passwordResetExpiresAt;
    delete safeObject.passwordResetSentAt;
    delete safeObject.__v;

    return safeObject;
  },
});

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = model("User", userSchema);
