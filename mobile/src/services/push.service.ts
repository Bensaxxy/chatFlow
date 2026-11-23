import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/types/api";

export interface PushNotificationConfiguration {
  enabled: boolean;
  publicKey: string | null;
}

export interface WebPushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Mirrors the backend's Web Push API. Native Expo device tokens are a different
 * protocol, so they intentionally are not posted to this Web Push endpoint.
 */
export const getMobilePushConfiguration = async (): Promise<PushNotificationConfiguration> => {
  const { data } = await apiClient.get<
    ApiSuccessResponse<PushNotificationConfiguration>
  >("/push/config");
  return data.data;
};

export const subscribeMobileWebPush = async (
  subscription: WebPushSubscriptionPayload,
): Promise<void> => {
  await apiClient.post("/push/subscriptions", subscription);
};

export const unsubscribeMobileWebPush = async (endpoint: string): Promise<void> => {
  await apiClient.delete("/push/subscriptions", { data: { endpoint } });
};
