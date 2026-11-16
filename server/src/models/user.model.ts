import { model, Schema, type InferSchemaType } from "mongoose";

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

    lastSeenAt: {
      type: Date,
      default: Date.now,
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
    delete safeObject.avatarPublicId;
    delete safeObject.__v;

    return safeObject;
  },
});

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = model("User", userSchema);
