import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "chatflow.mobile.refresh-token";

let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getRefreshToken = async (): Promise<string | null> =>
  SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const setRefreshToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
};

export const saveMobileTokens = async (
  newAccessToken: string,
  newRefreshToken: string,
): Promise<void> => {
  setAccessToken(newAccessToken);

  await setRefreshToken(newRefreshToken);
};

export const clearMobileTokens = async (): Promise<void> => {
  setAccessToken(null);

  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};
