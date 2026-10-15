import mongoose from "mongoose";
import { env } from "./env.js";

const RETRY_DELAY_MS = 10000;

mongoose.set("bufferCommands", false);

mongoose.connection.on("connected", () => console.log("MongoDB connected"));
mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));
mongoose.connection.on("error", (error) => console.error("MongoDB error:", error.message));

export const isDbConnected = () => mongoose.connection.readyState === 1;

export const connectDb = async () => {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}. Retrying in ${RETRY_DELAY_MS / 1000}s`);
    setTimeout(connectDb, RETRY_DELAY_MS);
  }
};

export const disconnectDb = () => mongoose.disconnect();
