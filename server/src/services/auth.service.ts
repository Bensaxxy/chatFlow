import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";

import { env } from "../config/env";
import { User } from "../models/user.model";
import { AppError } from "../utils/app-error";
import { sendVerificationEmail } from "./email.service";

import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from "../validations/auth.validation";

const PASSWORD_HASH_ROUNDS = 12;

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;

const createVerificationCode = (): string =>
  randomInt(100000, 1000000).toString();

const hashVerificationCode = (email: string, code: string): string =>
  createHmac("sha256", env.EMAIL_VERIFICATION_SECRET)
    .update(`${email.toLowerCase()}:${code}`)
    .digest("hex");

const verificationHashesMatch = (
  storedHash: string,
  suppliedHash: string,
): boolean => {
  const storedBuffer = Buffer.from(storedHash, "hex");
  const suppliedBuffer = Buffer.from(suppliedHash, "hex");

  if (storedBuffer.length !== suppliedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, suppliedBuffer);
};

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await User.exists({
    email: input.email,
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists",
      409,
      "EMAIL_ALREADY_EXISTS",
    );
  }

  const verificationCode = createVerificationCode();

  const [passwordHash, verificationCodeHash] = await Promise.all([
    bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS),
    Promise.resolve(hashVerificationCode(input.email, verificationCode)),
  ]);

  const now = new Date();

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,

    isEmailVerified: false,
    emailVerifiedAt: null,

    emailVerificationCodeHash: verificationCodeHash,
    emailVerificationExpiresAt: new Date(
      now.getTime() + VERIFICATION_CODE_TTL_MS,
    ),
    emailVerificationSentAt: now,
    emailVerificationAttempts: 0,
  });

  try {
    await sendVerificationEmail({
      recipientName: user.name,
      recipientEmail: user.email,
      verificationCode,
    });
  } catch (error) {
    console.error("Could not send verification email:", error);

    // Avoid blocking a future registration with an account that has no code.
    await User.deleteOne({ _id: user._id });

    throw new AppError(
      "We could not send the verification email. Your account was not created; please try again shortly.",
      503,
      "VERIFICATION_EMAIL_DELIVERY_FAILED",
    );
  }

  return user;
};

export const verifyUserEmail = async (input: VerifyEmailInput) => {
  const user = await User.findOne({
    email: input.email,
  }).select(
    [
      "+emailVerificationCodeHash",
      "+emailVerificationExpiresAt",
      "+emailVerificationAttempts",
      "+emailVerificationSentAt",
    ].join(" "),
  );

  if (!user) {
    throw new AppError(
      "The verification code is invalid or has expired",
      400,
      "INVALID_VERIFICATION_CODE",
    );
  }

  if (user.isEmailVerified) {
    throw new AppError(
      "This email address has already been verified",
      409,
      "EMAIL_ALREADY_VERIFIED",
    );
  }

  if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
    throw new AppError(
      "The verification code is invalid or has expired",
      400,
      "INVALID_VERIFICATION_CODE",
    );
  }

  if (user.emailVerificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw new AppError(
      "Too many incorrect attempts. Request a new verification code.",
      429,
      "VERIFICATION_ATTEMPTS_EXCEEDED",
    );
  }

  if (user.emailVerificationExpiresAt.getTime() <= Date.now()) {
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpiresAt = null;
    user.emailVerificationAttempts = 0;

    await user.save();

    throw new AppError(
      "The verification code has expired. Request a new code.",
      400,
      "VERIFICATION_CODE_EXPIRED",
    );
  }

  const suppliedHash = hashVerificationCode(user.email, input.code);

  const codeMatches = verificationHashesMatch(
    user.emailVerificationCodeHash,
    suppliedHash,
  );

  if (!codeMatches) {
    user.emailVerificationAttempts += 1;

    await user.save();

    const attemptsRemaining = Math.max(
      0,
      MAX_VERIFICATION_ATTEMPTS - user.emailVerificationAttempts,
    );

    throw new AppError(
      attemptsRemaining > 0
        ? `Verification code is incorrect. ${attemptsRemaining} attempt${
            attemptsRemaining === 1 ? "" : "s"
          } remaining.`
        : "Too many incorrect attempts. Request a new verification code.",
      attemptsRemaining > 0 ? 400 : 429,
      attemptsRemaining > 0
        ? "INVALID_VERIFICATION_CODE"
        : "VERIFICATION_ATTEMPTS_EXCEEDED",
    );
  }

  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationCodeHash = null;
  user.emailVerificationExpiresAt = null;
  user.emailVerificationSentAt = null;
  user.emailVerificationAttempts = 0;

  await user.save();

  return user;
};

export const resendUserVerificationCode = async (
  input: ResendVerificationInput,
): Promise<void> => {
  const user = await User.findOne({
    email: input.email,
  }).select(
    [
      "+emailVerificationCodeHash",
      "+emailVerificationExpiresAt",
      "+emailVerificationSentAt",
      "+emailVerificationAttempts",
    ].join(" "),
  );

  // Keep the public response generic to reduce account enumeration.
  if (!user || user.isEmailVerified) {
    return;
  }

  if (user.emailVerificationSentAt) {
    const nextAllowedAt =
      user.emailVerificationSentAt.getTime() + VERIFICATION_RESEND_COOLDOWN_MS;

    if (nextAllowedAt > Date.now()) {
      const retryAfterSeconds = Math.ceil((nextAllowedAt - Date.now()) / 1000);

      throw new AppError(
        `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
        429,
        "VERIFICATION_RESEND_COOLDOWN",
      );
    }
  }

  const verificationCode = createVerificationCode();
  const now = new Date();

  user.emailVerificationCodeHash = hashVerificationCode(
    user.email,
    verificationCode,
  );

  user.emailVerificationExpiresAt = new Date(
    now.getTime() + VERIFICATION_CODE_TTL_MS,
  );

  user.emailVerificationSentAt = now;
  user.emailVerificationAttempts = 0;

  await user.save();

  try {
    await sendVerificationEmail({
      recipientName: user.name,
      recipientEmail: user.email,
      verificationCode,
    });
  } catch (error) {
    console.error("Could not resend verification email:", error);

    // Allow another request immediately if delivery failed.
    user.emailVerificationSentAt = null;
    await user.save();

    throw new AppError(
      "The verification email could not be sent. Please try again.",
      503,
      "VERIFICATION_EMAIL_DELIVERY_FAILED",
    );
  }
};

export const loginUser = async (input: LoginInput) => {
  const user = await User.findOne({
    email: input.email,
  }).select("+passwordHash");

  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (user.isEmailVerified !== true) {
    throw new AppError(
      "Verify your email address before logging in",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  return user;
};

export const getCurrentUser = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(
      "Authenticated user was not found",
      401,
      "USER_NOT_FOUND",
    );
  }

  return user;
};

export const changeUserPassword = async (
  userId: string,
  input: ChangePasswordInput,
): Promise<void> => {
  const user = await User.findById(userId).select("+passwordHash");

  if (!user) {
    throw new AppError(
      "Authenticated user was not found",
      401,
      "USER_NOT_FOUND",
    );
  }

  const currentPasswordMatches = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  );

  if (!currentPasswordMatches) {
    throw new AppError(
      "Current password is incorrect",
      400,
      "INCORRECT_CURRENT_PASSWORD",
    );
  }

  const newPasswordMatchesCurrent = await bcrypt.compare(
    input.newPassword,
    user.passwordHash,
  );

  if (newPasswordMatchesCurrent) {
    throw new AppError(
      "New password must be different from your current password",
      400,
      "PASSWORD_UNCHANGED",
    );
  }

  user.passwordHash = await bcrypt.hash(
    input.newPassword,
    PASSWORD_HASH_ROUNDS,
  );

  await user.save();
};
