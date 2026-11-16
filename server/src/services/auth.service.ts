import bcrypt from "bcryptjs";

import { User } from "../models/user.model";
import { AppError } from "../utils/app-error";
import type { LoginInput, RegisterInput } from "../validations/auth.validation";

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

  const passwordHash = await bcrypt.hash(input.password, 12);

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
