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
import { upload } from "../config/multer.js";

const busRoute = Router();

// Create route (admin) with route map image upload (field: routeMap)
busRoute.post(
  "/",
  authenticated,
  authorization("admin"),
  upload.single("routeMap"),
  createRoute
);

// List
busRoute.get("/", authenticated, readRoute);

// Get by slug
busRoute.get("/slug/:routeURL", authenticated, readRouteByURL);

// Get by ID
busRoute.get("/:id", authenticated, readSpecificRoute);

// Update (admin) with optional new image
busRoute.patch(
  "//:id",
  authenticated,
  authorization("admin"),
  upload.single("routeMap"),
  updateRoute
);

// Delete (admin)
busRoute.delete("/:id", authenticated, authorization("admin"), deleteRoute);

export default busRoute;
