import { model, Schema } from "mongoose";

const messageAttachmentSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    resourceType: {
      type: String,
      enum: ["image", "raw", "video"],
      required: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    mimeType: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
      min: 0,
    },

    width: {
      type: Number,
      default: null,
    },

    height: {
      type: Number,
      default: null,
    },

    duration: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "file", "audio"],
      default: "text",
    },

    /**
     * Text messages require content through Zod validation.
     * Image and file messages may have an empty caption.
     */
    content: {
      type: String,
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
      default: "",
    },

    attachment: {
      type: messageAttachmentSchema,
      default: null,
    },

    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    isForwarded: {
      type: Boolean,
      default: false,
    },

    forwardedFrom: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      select: false,
    },

    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reactions: [
      {
        emoji: {
          type: String,
          enum: ["👍", "❤️", "😂", "😮", "😢", "🙏"],
          required: true,
        },

        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        reactedAt: {
          type: Date,
          default: Date.now,
        },

        _id: false,
      },
    ],

    editedAt: {
      type: Date,
      default: null,
    },

    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deletedForEveryoneAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({
  conversation: 1,
  _id: -1,
});

messageSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    const safeObject = returnedObject as Record<string, unknown>;

    delete safeObject.forwardedFrom;
    delete safeObject.__v;

    const attachment = safeObject.attachment as
      | Record<string, unknown>
      | null
      | undefined;

    /**
     * The Cloudinary public ID is an internal storage detail.
     * Clients only need the secure URL and file metadata.
     */
    if (attachment) {
      delete attachment.publicId;
    }

    return safeObject;
  },
});

export const Message = model("Message", messageSchema);
