import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { isDbConnected } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import repoRoutes from "./routes/repoRoutes.js";
import savedRoutes from "./routes/savedRoutes.js";
import { getRateLimitStatus, hasGithubToken } from "./services/githubClient.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
      exposedHeaders: ["X-Cache", "Retry-After"],
      optionsSuccessStatus: 204,
    })
  );
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      database: isDbConnected() ? "connected" : "disconnected",
      githubTokenConfigured: hasGithubToken(),
      rateLimits: getRateLimitStatus(),
    });
  });

  app.use("/api/repos", repoRoutes);
  app.use("/api/saved", savedRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
