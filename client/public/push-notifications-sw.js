const DEFAULT_URL = "/chats";

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "ChatFlow",
      body: "You have a new message.",
    };
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      if (windows.some((client) => client.focused)) {
        windows.forEach((client) => {
          client.postMessage({
            type: "chatflow:push-received",
            payload,
          });
        });

        return;
      }

      await self.registration.showNotification(payload.title || "ChatFlow", {
        body: payload.body || "You have a new message.",
        tag: payload.tag || "chatflow-message",
        vibrate: payload.vibrate === false ? undefined : [70, 45, 70],
        data: {
          url: payload.url || DEFAULT_URL,
        },
        renotify: false,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || DEFAULT_URL;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existingWindow = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );

      if (existingWindow) {
        await existingWindow.navigate(targetUrl);
        await existingWindow.focus();

        return;
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});
