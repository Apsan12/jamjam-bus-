import { Router } from "express";
import {
  createUser,
  verifyEmail,
  loginUser,
  refreshSession,
  logoutUser,
  userProfile,
  requestPasswordReset,
  resetPassword,
  updateUser,
  updatePassword,
  getAllUsers,
  getUserById,
  deleteUser,
} from "../controller/user.controller.js";
import authenticated from "../middleware/authinticate.js";
import authorization from "../middleware/authorize.js";

const userRouter = Router();

// Public
userRouter.post("/register", createUser);
userRouter.get("/verify", verifyEmail);
userRouter.post("/login", loginUser);
userRouter.post("/refresh", refreshSession);
userRouter.post("/request-reset", requestPasswordReset);
userRouter.post("/reset-password", resetPassword);

// Authenticated
userRouter.get("/me", authenticated, userProfile);
userRouter.patch("/update", authenticated, updateUser);
userRouter.patch("/password", authenticated, updatePassword);
userRouter.post("/logout", authenticated, logoutUser);

// Admin/self protected (reuse auth middleware
userRouter.get("/", authenticated, authorization("admin"), getAllUsers);
userRouter.get("/:id", authenticated, authorization("admin"), getUserById);
userRouter.delete("/:id", authenticated, authorization("admin"), deleteUser);

export default userRouter;
