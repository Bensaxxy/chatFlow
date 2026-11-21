import { apiClient } from "@/lib/api/client";

export interface PushNotificationConfiguration {
  enabled: boolean;
  publicKey: string | null;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushConfigurationResponse {
  data: PushNotificationConfiguration;
}

const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

const toApplicationServerKey = (value: string): ArrayBuffer => {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedValue = normalizedValue.padEnd(
    normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4),
    "=",
  );
  const decodedValue = window.atob(paddedValue);
  const keyBuffer = new ArrayBuffer(decodedValue.length);
  const key = new Uint8Array(keyBuffer);

  for (let index = 0; index < decodedValue.length; index += 1) {
    key[index] = decodedValue.charCodeAt(index);
  }

  return keyBuffer;
};

const toSubscriptionPayload = (
  subscription: PushSubscription,
): PushSubscriptionPayload => {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!json.endpoint || !p256dh || !auth) {
    throw new Error("Your browser returned an incomplete push subscription");
  }

  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh,
      auth,
    },
  };
};

const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration> =>
  navigator.serviceWorker.register("/push-notifications-sw.js", {
    scope: "/",
  });

export const getPushNotificationConfiguration = async (): Promise<PushNotificationConfiguration> => {
  const { data } = await apiClient.get<PushConfigurationResponse>("/push/config");

  return data.data;
};

export const getPushNotificationStatus = async (): Promise<{
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
}> => {
  if (!isPushSupported()) {
    return {
      isSupported: false,
      permission: "unsupported",
      isSubscribed: false,
    };
  }

  const registration = await navigator.serviceWorker.getRegistration(
    "/push-notifications-sw.js",
  );
  const subscription = await registration?.pushManager.getSubscription();

  return {
    isSupported: true,
    permission: Notification.permission,
    isSubscribed: Boolean(subscription),
  };
};

export const enablePushNotifications = async (): Promise<{
  permission: NotificationPermission;
  isSubscribed: boolean;
}> => {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported by this browser");
  }

  const configuration = await getPushNotificationConfiguration();

  if (!configuration.enabled || !configuration.publicKey) {
    throw new Error("Push notifications are not configured on this server yet");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    return {
      permission,
      isSubscribed: false,
    };
  }

  const registration = await getServiceWorkerRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toApplicationServerKey(configuration.publicKey),
    }));

  await apiClient.post("/push/subscriptions", toSubscriptionPayload(subscription));

  return {
    permission,
    isSubscribed: true,
  };
};

export const disablePushNotifications = async (): Promise<void> => {
  if (!isPushSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration(
    "/push-notifications-sw.js",
  );
  const subscription = await registration?.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await apiClient.delete("/push/subscriptions", {
    data: {
      endpoint: subscription.endpoint,
    },
  });

  await subscription.unsubscribe();
};
