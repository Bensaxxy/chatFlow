import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginFormValues = z.infer<
  typeof loginSchema
>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(60, "Name cannot exceed 60 characters"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .max(72, "Password cannot exceed 72 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const verificationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the six-digit code from your email"),
});

export type VerificationFormValues = z.infer<typeof verificationSchema>;

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
});

export type EmailFormValues = z.infer<typeof emailSchema>;
