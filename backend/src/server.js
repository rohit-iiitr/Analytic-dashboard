import { createApp } from "./app.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { env } from "./config/env.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`API server listening on http://localhost:${env.port}`);
  if (!env.githubToken) {
    console.warn("GITHUB_TOKEN is not set. Requests use GitHub's unauthenticated rate limit (60/hour, 10 searches/minute).");
  }
});

connectDb();

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await disconnectDb().catch(() => {});
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));
