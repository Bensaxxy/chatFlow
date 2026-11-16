import { model, Schema, Types } from "mongoose";

const conversationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },

    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    /*
     * A sorted combination of two user IDs prevents
     * duplicate direct conversations.
     */
    directKey: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({
  participants: 1,
  updatedAt: -1,
});

conversationSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    const safeObject = returnedObject as Record<string, unknown>;

    delete safeObject.directKey;
    delete safeObject.__v;

    return safeObject;
  },
});

export const Conversation = model("Conversation", conversationSchema);

export type ConversationId = Types.ObjectId;
