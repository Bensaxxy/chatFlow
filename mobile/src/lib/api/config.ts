const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!configuredApiUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is missing from the mobile .env file");
}

export const API_URL = configuredApiUrl.replace(/\/+$/, "");
