import { model, Schema, type InferSchemaType } from "mongoose";

export const STATUS_REACTION_EMOJIS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "🔥",
  "👏",
] as const;

export const STATUS_AUDIENCES = [
  "everyone",
  "people_i_chat_with",
  "selected_users",
  "except_users",
] as const;

export const STATUS_BACKGROUNDS = [
  "slate",
  "cyan",
  "violet",
  "emerald",
  "rose",
  "amber",
] as const;

const statusPhotoSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      maxlength: 2048,
    },

    publicId: {
      type: String,
      required: true,
      select: false,
    },

    width: {
      type: Number,
      default: null,
      min: 1,
    },

    height: {
      type: Number,
      default: null,
      min: 1,
    },

    mimeType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/webp"],
    },

    size: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

const statusViewerSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    viewedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const statusReactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    emoji: {
      type: String,
      enum: STATUS_REACTION_EMOJIS,
      required: true,
    },

    reactedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const statusSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["text", "photo"],
      required: true,
    },

    text: {
      type: String,
      trim: true,
      maxlength: [700, "Status text cannot exceed 700 characters"],
      default: "",
    },

    photo: {
      type: statusPhotoSchema,
      default: null,
    },

    backgroundColor: {
      type: String,
      enum: STATUS_BACKGROUNDS,
      default: "cyan",
    },

    textColor: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },

    audience: {
      type: String,
      enum: STATUS_AUDIENCES,
      default: "people_i_chat_with",
      index: true,
    },

    selectedUsers: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },

    excludedUsers: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },

    viewers: {
      type: [statusViewerSchema],
      default: [],
    },

    reactions: {
      type: [statusReactionSchema],
      default: [],
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    cleanupStartedAt: {
      type: Date,
      default: null,
      select: false,
    },

    cleanupAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

statusSchema.index({
  author: 1,
  createdAt: -1,
});

statusSchema.index({
  audience: 1,
  expiresAt: 1,
});

statusSchema.index({
  selectedUsers: 1,
  expiresAt: 1,
});

statusSchema.index({
  expiresAt: 1,
  cleanupStartedAt: 1,
});

statusSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    const safeObject = returnedObject as Record<string, unknown>;

    delete safeObject.__v;
    delete safeObject.cleanupStartedAt;
    delete safeObject.cleanupAttempts;

    const photo = safeObject.photo as
      | Record<string, unknown>
      | null
      | undefined;

    if (photo) {
      delete photo.publicId;
    }

    return safeObject;
  },
});

export type StatusDocument = InferSchemaType<typeof statusSchema>;

export const Status = model("Status", statusSchema);
