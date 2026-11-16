import type { CookieOptions, Response } from "express";

import { env } from "../config/env";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export const setAuthCookies = (
  response: Response,
  accessToken: string,
  refreshToken: string,
): void => {
  response.cookie("accessToken", accessToken, {
    ...baseCookieOptions,
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
  });

  response.cookie("refreshToken", refreshToken, {
    ...baseCookieOptions,
    maxAge: env.REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
};

export const clearAuthCookies = (response: Response): void => {
  response.clearCookie("accessToken", baseCookieOptions);

  response.clearCookie("refreshToken", baseCookieOptions);
};
