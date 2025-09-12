import User from "../model/user.model.js";
import { comparePassword, hashPassword } from "../utils/hash.password.js";
import {
  generateRefreshToken,
  generateToken,
  verifyToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from "../utils/jsonweb.token.js";
import {
  sendMail,
  welcomeEmailTemplate,
  resetPasswordTemplate,
} from "../utils/sendmail.js";
import { setAuthCookies, clearAuthCookies } from "../config/cookie.js";
import crypto from "crypto";

// Register / Create User
export const createUser = async (req, res) => {
  try {
    const { username, password, email, phoneNumber } = req.body;
    if (!username || !password || !email || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = new User({
      username,
      email: email.trim().toLowerCase(),
      phoneNumber,
      password: hashedPassword,
      isVerified: false,
    });
    await newUser.save();

    const token = generateToken(newUser._id);
    const verificationLink = `http://localhost:3000/api/users/verify?token=${token}`;

    await sendMail(
      newUser.email,
      "Welcome to Our GoBus Service",
      welcomeEmailTemplate(username, verificationLink)
    );

    res.status(201).json({
      message: "Verification mail sent",
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Email Verification
export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token)
    return res.status(400).json({ message: "Verification token is required" });

  try {
    const decoded = verifyToken(token);
    if (!decoded)
      return res.status(400).json({ message: "Invalid or expired token" });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified)
      return res.status(200).json({ message: "Email already verified" });

    user.isVerified = true;
    await user.save();
    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Email not verified" });

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Refresh session (issue new access token)
export const refreshSession = (req, res) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (!rt) return res.status(401).json({ message: "No refresh token" });

    const decoded = verifyRefreshToken(rt);
    if (!decoded)
      return res.status(401).json({ message: "Invalid refresh token" });

    const newAccess = generateToken(decoded.id);
    // Keep same refresh for now; to rotate uncomment below
    // revokeRefreshToken(rt);
    // const newRefresh = generateRefreshToken(decoded.id);
    setAuthCookies(res, newAccess, rt);
    res.status(200).json({ message: "Session refreshed" });
  } catch (e) {
    console.error("Error refreshing session:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Logout
export const logoutUser = (req, res) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (rt) revokeRefreshToken(rt);
    clearAuthCookies(res);
    res.status(200).json({ message: "Logged out" });
  } catch (e) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Profile
export const userProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Request password reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user)
      return res
        .status(200)
        .json({ message: "If the email exists, a reset link was sent" });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 min
    await user.save();

    const resetLink = `http://localhost:3001/reset-password?token=${rawToken}`; // frontend page recommended

    await sendMail(
      user.email,
      "Reset Your Password",
      resetPasswordTemplate(user.username, resetLink)
    );

    res
      .status(200)
      .json({ message: "a reset link was sent to your email address" });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Reset password (with token)
export const resetPassword = async (req, res) => {
  try {
    const token = req.body.token || req.query.token;
    const { newPassword } = req.body;
    if (!token || !newPassword)
      return res
        .status(400)
        .json({ message: "Token and newPassword required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update basic profile fields
export const updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, phoneNumber } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username) user.username = username;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    await user.save();

    res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user._id,
        username: user.username,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Change password (authenticated)
export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Current password is incorrect" });

    user.password = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// ...existing code...

// Get all users (admin)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ count: users.length, users });
  } catch (e) {
    console.error("Error fetching users:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single user by ID (admin or self)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;

    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user._id.toString() !== requesterId && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.status(200).json({ user });
  } catch (e) {
    console.error("Error fetching user:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete user (admin or self)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user._id.toString() !== requesterId && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    await user.deleteOne();
    res.status(200).json({ message: "User deleted" });
  } catch (e) {
    console.error("Error deleting user:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ...existing code...
