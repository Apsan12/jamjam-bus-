import mongoose from "mongoose";
import { config } from "dotenv";

// Load environment variables from .env file
config();

mongoose.set("strictQuery", true);
if (process.env.NODE_ENV === "development") {
  mongoose.set("debug", true);
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error("Missing MONGO_URI in environment");
}

const DEFAULT_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  // family: 4, // uncomment to force IPv4 if needed
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const connectDB = async (retries = 5) => {
  let attempt = 0;
  while (true) {
    try {
      const conn = await mongoose.connect(MONGO_URI, {
        ...DEFAULT_OPTIONS,
        ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}),
      });

      console.log(
        `MongoDB connected: ${conn.connection.host}/${conn.connection.name}`
      );

      const db = mongoose.connection;
      db.on("error", (err) => console.error("MongoDB error:", err.message));
      db.on("disconnected", () => console.warn("MongoDB disconnected"));

      const shutdown = async (signal) => {
        try {
          await mongoose.connection.close();
          console.log(`MongoDB connection closed on ${signal}`);
        } finally {
          process.exit(0);
        }
      };
      process.once("SIGINT", () => shutdown("SIGINT"));
      process.once("SIGTERM", () => shutdown("SIGTERM"));

      return conn;
    } catch (err) {
      attempt += 1;
      const canRetry = attempt <= retries;
      console.error(
        `MongoDB connect attempt ${attempt} failed: ${err.message}${
          canRetry ? " - retrying..." : ""
        }`
      );
      if (!canRetry) throw err;
      const delay = Math.min(30000, 1000 * 2 ** (attempt - 1)); // up to 30s
      await wait(delay);
    }
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  } catch (e) {
    console.error("Error closing MongoDB connection:", e.message);
  }
};

export default connectDB;
