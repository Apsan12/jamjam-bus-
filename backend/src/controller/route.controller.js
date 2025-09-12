import Route from "../model/route.model.js";
import Bus from "../model/bus.model.js";
import { cloudinary } from "../config/multer.js"; // reuse configured cloudinary

/* Helpers */
const slugify = (str) =>
  str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);

const buildUniqueSlug = async (base) => {
  let slug = base;
  let i = 1;
  while (await Route.findOne({ routeURL: slug })) slug = `${base}-${i++}`;
  return slug;
};

const parsePositiveNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const findRouteOr404 = async (id, res) => {
  if (!id) {
    res.status(400).json({ message: "Route ID required" });
    return null;
  }
  const route = await Route.findById(id).populate("bus");
  if (!route) {
    res.status(404).json({ message: "Route not found" });
    return null;
  }
  return route;
};

/* Create */
export const createRoute = async (req, res) => {
  try {
    let { routeName, startLocation, endLocation, distance, busId } = req.body;

    if (!routeName || !startLocation || !endLocation || !distance || !busId) {
      return res.status(400).json({
        message:
          "routeName, startLocation, endLocation, distance, busId are required",
      });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Route map image (routeMap) is required" });
    }

    routeName = routeName.trim();
    startLocation = startLocation.trim();
    endLocation = endLocation.trim();

    distance = parsePositiveNumber(distance);
    if (!distance)
      return res
        .status(400)
        .json({ message: "distance must be a positive number" });

    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ message: "Bus not found" });

    const duplicate = await Route.findOne({
      routeName,
      startLocation,
      endLocation,
    });
    if (duplicate)
      return res
        .status(409)
        .json({ message: "Route with same name and endpoints exists" });

    const baseSlug = slugify(routeName);
    const routeURL = await buildUniqueSlug(baseSlug);

    const route = await Route.create({
      routeName,
      startLocation,
      endLocation,
      distance,
      bus: busId,
      routeURL,
      routeMapUrl: req.file.path,
      routeMapPublicId: req.file.filename,
    });

    res.status(201).json({ message: "Route created", route });
  } catch (e) {
    console.error("createRoute error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

/* List with filtering/search/sort/pagination */
export const readRoute = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const {
      search,
      busId,
      minDistance,
      maxDistance,
      sort = "-createdAt",
    } = req.query;

    const filter = {};
    if (busId) filter.bus = busId;

    const dist = {};
    if (minDistance) {
      const v = Number(minDistance);
      if (Number.isFinite(v)) dist.$gte = v;
    }
    if (maxDistance) {
      const v = Number(maxDistance);
      if (Number.isFinite(v)) dist.$lte = v;
    }
    if (Object.keys(dist).length) filter.distance = dist;

    if (search?.trim()) {
      const rx = new RegExp(search.trim(), "i");
      filter.$or = [
        { routeName: rx },
        { startLocation: rx },
        { endLocation: rx },
      ];
    }

    const sortObj = {};
    sort
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((f) => {
        if (f.startsWith("-")) sortObj[f.substring(1)] = -1;
        else sortObj[f] = 1;
      });

    const [routes, total] = await Promise.all([
      Route.find(filter)
        .populate("bus")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Route.countDocuments(filter),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: routes.length,
      routes,
    });
  } catch (e) {
    console.error("readRoute error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

/* Read specific by ID */
export const readSpecificRoute = async (req, res) => {
  try {
    const route = await findRouteOr404(req.params.id, res);
    if (!route) return;
    res.status(200).json({ route });
  } catch (e) {
    console.error("readSpecificRoute error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

/* Read by slug */
export const readRouteByURL = async (req, res) => {
  try {
    const { routeURL } = req.params;
    if (!routeURL)
      return res.status(400).json({ message: "routeURL required" });
    const route = await Route.findOne({ routeURL }).populate("bus");
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.status(200).json({ route });
  } catch (e) {
    console.error("readRouteByURL error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

/* Update */
export const updateRoute = async (req, res) => {
  try {
    const route = await findRouteOr404(req.params.id, res);
    if (!route) return;

    const { routeName, startLocation, endLocation, distance, busId } = req.body;

    // If routeName changes -> new slug (unique)
    if (routeName && routeName.trim() && routeName !== route.routeName) {
      const base = slugify(routeName);
      route.routeURL = await buildUniqueSlug(base);
      route.routeName = routeName.trim();
    }
    if (startLocation?.trim()) route.startLocation = startLocation.trim();
    if (endLocation?.trim()) route.endLocation = endLocation.trim();

    if (distance !== undefined) {
      const d = parsePositiveNumber(distance);
      if (!d)
        return res
          .status(400)
          .json({ message: "distance must be positive number" });
      route.distance = d;
    }

    if (busId) {
      const bus = await Bus.findById(busId);
      if (!bus) return res.status(404).json({ message: "Bus not found" });
      route.bus = busId;
    }

    if (req.file) {
      if (route.routeMapPublicId) {
        try {
          await cloudinary.uploader.destroy(route.routeMapPublicId);
        } catch (err) {
          console.warn("Cloudinary destroy failed:", err.message);
        }
      }
      route.routeMapUrl = req.file.path;
      route.routeMapPublicId = req.file.filename;
    }

    // Duplicate check if core identifiers changed
    const duplicate = await Route.findOne({
      _id: { $ne: route._id },
      routeName: route.routeName,
      startLocation: route.startLocation,
      endLocation: route.endLocation,
    });
    if (duplicate)
      return res
        .status(409)
        .json({ message: "Another route with same identifiers exists" });

    await route.save();
    res.status(200).json({ message: "Route updated", route });
  } catch (e) {
    console.error("updateRoute error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

/* Delete (hard) */
export const deleteRoute = async (req, res) => {
  try {
    const route = await findRouteOr404(req.params.id, res);
    if (!route) return;

    if (route.routeMapPublicId) {
      try {
        await cloudinary.uploader.destroy(route.routeMapPublicId);
      } catch (err) {
        console.warn("Cloudinary destroy failed:", err.message);
      }
    }

    await route.deleteOne();
    res.status(200).json({ message: "Route deleted" });
  } catch (e) {
    console.error("deleteRoute error:", e);
    res.status(500).json({ message: "Server error" });
  }
};
