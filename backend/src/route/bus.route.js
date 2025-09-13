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

const busRouter = Router();

// Create bus (admin) - upload handled inside controller
busRouter.post("/", authenticated, authorization("admin"), createBus);

// List buses (auth)
busRouter.get("/", authenticated, readBus);

// Get single bus by ID (auth)
busRouter.get("/:id", authenticated, readSpecificBus);

// Update (admin) - upload handled inside controller
busRouter.patch("/:id", authenticated, authorization("admin"), updateBus);

// Delete (admin)
busRouter.delete("/:id", authenticated, authorization("admin"), deleteBus);

export default busRouter;
