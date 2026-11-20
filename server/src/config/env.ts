import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),

  CLIENT_URL: z.string().url().default("http://localhost:3000"),

  /*
   * JSON array of RTCIceServer entries. Keep TURN credentials on the API
   * deployment so the client can request the current relay configuration at
   * call time instead of depending on a build-time public environment value.
   */
  WEBRTC_ICE_SERVERS: z.string().optional(),

  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "MONGODB_URI must be a valid MongoDB connection string",
    ),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must contain at least 32 characters"),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must contain at least 32 characters"),

  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(604800),

  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),

  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),

  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment variables:",
    result.error.flatten().fieldErrors,
  );

  throw new Error("Environment validation failed");
}

export const env = result.data;
