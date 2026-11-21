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

  /*
   * A simpler alternative for hosting providers whose environment editor is
   * awkward for JSON. URLs are comma-separated and the credentials stay on
   * the API server, never in the browser bundle.
   */
  WEBRTC_TURN_URLS: z.string().optional(),

  WEBRTC_TURN_USERNAME: z.string().optional(),

  WEBRTC_TURN_CREDENTIAL: z.string().optional(),

  /*
   * Web Push is optional so existing deployments keep starting normally.
   * When enabled, all three values must be supplied from the same VAPID pair.
   */
  VAPID_SUBJECT: z.string().trim().min(1).optional(),

  VAPID_PUBLIC_KEY: z.string().trim().min(1).optional(),

  VAPID_PRIVATE_KEY: z.string().trim().min(1).optional(),

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

  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),

  SMTP_PORT: z.coerce.number().int().positive().default(587),

  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  SMTP_USER: z.string().min(1, "SMTP_USER is required"),

  SMTP_PASSWORD: z.string().min(1, "SMTP_PASSWORD is required"),

  EMAIL_FROM: z.string().min(1, "EMAIL_FROM is required"),

  /*
   * Render free services cannot open outbound SMTP connections. When this is
   * configured, transactional messages are sent through Brevo over HTTPS.
   */
  BREVO_API_KEY: z.string().min(1).optional(),

  EMAIL_VERIFICATION_SECRET: z
    .string()
    .min(32, "EMAIL_VERIFICATION_SECRET must contain at least 32 characters"),
}).superRefine((values, context) => {
  const vapidValues = [
    values.VAPID_SUBJECT,
    values.VAPID_PUBLIC_KEY,
    values.VAPID_PRIVATE_KEY,
  ];

  const configuredVapidValueCount = vapidValues.filter(Boolean).length;

  if (configuredVapidValueCount > 0 && configuredVapidValueCount < 3) {
    context.addIssue({
      code: "custom",
      path: ["VAPID_PUBLIC_KEY"],
      message:
        "VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY must be configured together",
    });
  }

  if (
    values.VAPID_SUBJECT &&
    !values.VAPID_SUBJECT.startsWith("mailto:") &&
    !values.VAPID_SUBJECT.startsWith("https://")
  ) {
    context.addIssue({
      code: "custom",
      path: ["VAPID_SUBJECT"],
      message: "VAPID_SUBJECT must start with mailto: or https://",
    });
  }
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
