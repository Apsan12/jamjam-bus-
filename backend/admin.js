import { config } from "dotenv";
config();
import User from "./src/model/user.model.js";
import { hashPassword } from "./src/utils/hash.password.js";

/**
 * Ensures an admin user exists.
 * Reads credentials from environment:
 * ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME
 */
export const ensureAdminUser = async () => {
  try {
    const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const username = process.env.ADMIN_USERNAME || "Administrator";

    if (!email || !password) {
      console.warn(
        "[admin:init] ADMIN_EMAIL or ADMIN_PASSWORD missing. Skipping admin creation."
      );
      return;
    }

    let user = await User.findOne({ email });

    if (!user) {
      const hashed = await hashPassword(password);
      user = await User.create({
        username,
        email,
        phoneNumber: "0000000000",
        password: hashed,
        role: "admin",
        isVerified: true,
      });
      console.log("[admin:init] Admin user created:", email, password);
      return;
    }

    let changed = false;
    if (user.role !== "admin") {
      user.role = "admin";
      changed = true;
    }
    if (!user.isVerified) {
      user.isVerified = true;
      changed = true;
    }
    if (changed) {
      await user.save();
      console.log("[admin:init] Existing user elevated to admin:", email);
    } else {
      console.log("[admin:init] Admin already present:", email);
    }
  } catch (e) {
    console.error("[admin:init] Failed to ensure admin user:", e.message);
  }
};
