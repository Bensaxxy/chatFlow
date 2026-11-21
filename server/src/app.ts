import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";
import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes";
import conversationRouter from "./routes/conversation.routes";
import callRouter from "./routes/call.routes";
import pushNotificationRouter from "./routes/push-notification.routes";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    success: true,
    message: "ChatFlow API is running",
    environment: env.NODE_ENV,
  });
});
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/calls", callRouter);
app.use("/api/push", pushNotificationRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
