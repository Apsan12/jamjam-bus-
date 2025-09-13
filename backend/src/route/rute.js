import { Router } from "express";
import {
  createRoute,
  deleteRoute,
  readRoute,
  readRouteByURL,
  readSpecificRoute,
  updateRoute,
} from "../controller/route.controller.js";
import authenticated from "../middleware/authinticate.js";
import authorization from "../middleware/authorize.js";

const routeRouter = Router();

// Create route (admin)
routeRouter.post("/", authenticated, authorization("admin"), createRoute);

// List all routes
routeRouter.get("/", authenticated, readRoute);

// Get route by slug
routeRouter.get("/slug/:routeURL", authenticated, readRouteByURL);

// Get route by ID
routeRouter.get("/:id", authenticated, readSpecificRoute);

// Update route (admin)
routeRouter.patch("/:id", authenticated, authorization("admin"), updateRoute);

// Delete route (admin)
routeRouter.delete("/:id", authenticated, authorization("admin"), deleteRoute);

export default routeRouter;
