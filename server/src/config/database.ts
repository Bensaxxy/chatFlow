
import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI);

  console.log("MongoDB connected successfully✅");
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();

    console.log("MongoDB disconnected");
  }
};
