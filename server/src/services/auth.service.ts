import bcrypt from "bcryptjs";

import { User } from "../models/user.model";
import { AppError } from "../utils/app-error";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "../validations/auth.validation";

const PASSWORD_HASH_ROUNDS = 12;

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

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  return user;
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
