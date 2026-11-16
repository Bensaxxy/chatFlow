import { createServer, type Server } from "node:http";

import app from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { initializeSocketServer } from "./socket/socket.server";

let server: Server | undefined;

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

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
