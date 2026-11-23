import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "chatflow.mobile.device-id";

export interface MobileDeviceIdentity {
  deviceId: string;
  deviceName: string;
}

export const getMobileDeviceIdentity =
  async (): Promise<MobileDeviceIdentity> => {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = Crypto.randomUUID();

      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    }

    const deviceName =
      Device.deviceName?.trim() ||
      Device.modelName?.trim() ||
      `${Platform.OS} device`;

    return {
      deviceId,
      deviceName,
    };
  };
