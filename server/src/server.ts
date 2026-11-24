import { createServer, type Server } from "node:http";

import app from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { verifyEmailDeliveryProvider } from "./services/email.service";
import { initializeSocketServer } from "./socket/socket.server";
import { startStatusCleanupJob } from "./services/status-cleanup.service";

let server: Server | undefined;
let stopStatusCleanupJob: (() => void) | undefined;

const checkEmailTransport = async (): Promise<void> => {
  try {
    const provider = await verifyEmailDeliveryProvider();
    console.log(`Email delivery provider is ready (${provider}).`);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "SMTP_UNAVAILABLE";

    /*
     * Email delivery is required for registration, but a temporary SMTP
     * outage must not take the entire chat API offline. Registration will
     * return a clear 503 until the provider connection is restored.
     */
    console.warn(
      `SMTP connection could not be verified (${code}). Email verification is unavailable until the mail provider configuration is fixed.`,
    );
  }
};

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    stopStatusCleanupJob = startStatusCleanupJob();

    void checkEmailTransport();

    const httpServer = createServer(app);

    initializeSocketServer(httpServer);

    server = httpServer.listen(env.PORT, () => {
      console.log(
        `ChatFlow API and Socket.IO are running on http://localhost:${env.PORT}`,
      );
    });
  } catch (error) {
    console.error("Failed to start ChatFlow API:", error);

    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  console.log(`${signal} received. Shutting down...`);

  stopStatusCleanupJob?.();
  stopStatusCleanupJob = undefined;

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await disconnectDatabase();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
