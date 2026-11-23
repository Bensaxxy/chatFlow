import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(60, "Name cannot exceed 60 characters"),

  email: z.string().trim().toLowerCase().email("Enter a valid email address"),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),

  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),

    newPassword: z
      .string()
      .min(8, "New password must contain at least 8 characters")
      .max(72, "New password cannot exceed 72 characters"),

    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .superRefine((input, context) => {
    if (input.newPassword !== input.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Password confirmation does not match",
      });
    }

    if (input.currentPassword === input.newPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must be different from your current password",
      });
    }
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),

  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must contain exactly 6 digits"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .regex(/^[a-f\d]{64}$/i, "The reset link is invalid or has expired"),

    newPassword: z
      .string()
      .min(8, "New password must contain at least 8 characters")
      .max(72, "New password cannot exceed 72 characters"),

    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password confirmation does not match",
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const mobileLoginSchema = loginSchema.extend({
  deviceId: z
    .string()
    .trim()
    .min(1, "Device ID is required")
    .max(100, "Device ID is too long"),

  deviceName: z
    .string()
    .trim()
    .min(1, "Device name is required")
    .max(100, "Device name is too long"),
});

export type MobileLoginInput = z.infer<typeof mobileLoginSchema>;

export const mobileRefreshSchema = z.object({
  refreshToken: z
    .string()
    .trim()
    .min(1, "Refresh token is required")
    .max(300, "Refresh token is invalid"),
});

export type MobileRefreshInput = z.infer<typeof mobileRefreshSchema>;

export const mobileLogoutSchema = mobileRefreshSchema;

export type MobileLogoutInput = z.infer<typeof mobileLogoutSchema>;
