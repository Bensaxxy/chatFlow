import { model, Schema } from "mongoose";

const conversationPreferenceSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    markedUnreadAt: {
      type: Date,
      default: null,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
    mutedUntil: { type: Date, default: null },
    isMuted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

conversationPreferenceSchema.index(
  { user: 1, conversation: 1 },
  { unique: true },
);

conversationPreferenceSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    const safeObject = returnedObject as Record<string, unknown>;
    delete safeObject.__v;
    return safeObject;
  },
});

export const ConversationPreference = model(
  "ConversationPreference",
  conversationPreferenceSchema,
);
