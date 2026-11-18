import { model, Schema } from "mongoose";

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
      enum: ["text"],
      default: "text",
    },

    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
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

    return safeObject;
  },
});

export const Message = model("Message", messageSchema);