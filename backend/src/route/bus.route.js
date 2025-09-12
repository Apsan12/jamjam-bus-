import { Router } from "express";
import {
  createBus,
  readBus,
  readSpecificBus,
  updateBus,
  deleteBus,
} from "../controller/bus.controller.js";
import authenticated from "../middleware/authinticate.js";
import authorization from "../middleware/authorize.js";
import { upload } from "../config/multer.js";

const busRouter = Router();

// Create bus (admin) with image upload (field: image)
busRouter.post(
  "/",
  authenticated,
  authorization("admin"),
  upload.single("image"),
  createBus
);

// List buses (auth)
busRouter.get("/", authenticated, readBus);

// Get single bus by ID (auth)
busRouter.get("/:id", authenticated, readSpecificBus);

// Update (admin) – optional new image
busRouter.patch(
  "/:id",
  authenticated,
  authorization("admin"),
  upload.single("image"),
  updateBus
);

// Delete (admin)
busRouter.delete("/:id", authenticated, authorization("admin"), deleteBus);

export default busRouter;
