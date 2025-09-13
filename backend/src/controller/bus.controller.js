import Bus from "../model/bus.model.js";
import { v2 as cloudinary } from "cloudinary";

// Create Bus
import { uploadOne, UPLOAD_FOLDERS } from "../config/multer.js";

export const createBus = (req, res) => {
  const upload = uploadOne("image", { folder: UPLOAD_FOLDERS.buses });

  upload(req, res, async (err) => {
    if (err) return; // uploadOne already handled error responses

    try {
      let { busNumber, route, capacity, description = "", busName } = req.body;

      if (!busNumber || !capacity || !req.file) {
        return res
          .status(400)
          .json({ message: "busNumber, capacity, image are required" });
      }

      const normalizedBusNumber = busNumber.trim().toUpperCase();
      const capNum = Number(capacity);
      if (!Number.isFinite(capNum) || capNum <= 0) {
        return res
          .status(400)
          .json({ message: "capacity must be a positive number" });
      }

      const exists = await Bus.findOne({ busNumber: normalizedBusNumber });
      if (exists)
        return res.status(409).json({ message: "Bus number already exists" });

      const newBus = await Bus.create({
        busNumber: normalizedBusNumber,
        route,
        capacity: capNum,
        image: req.file.path,        // secure_url
        imagePublicId: req.file.filename, // public_id
        description: description.trim(),
        ...(busName ? { busName: busName.trim() } : {}),
      });

      return res
        .status(201)
        .json({ message: "Bus created successfully", bus: newBus });
    } catch (error) {
      console.error("createBus error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
};


// Get all buses (with optional pagination)
export const readBus = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [buses, total] = await Promise.all([
      Bus.find().populate("route").skip(skip).limit(limit).lean(),
      Bus.countDocuments(),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      buses,
    });
  } catch (error) {
    console.error("readBus error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single bus
export const readSpecificBus = async (req, res) => {
  try {
    const { id } = req.params;
    const bus = await Bus.findById(id).populate("route");
    if (!bus) return res.status(404).json({ message: "Bus not found" });
    res.status(200).json({ bus });
  } catch (error) {
    console.error("readSpecificBus error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update bus (handles optional new image)

export const updateBus = (req, res) => {
  const upload = uploadOne("image", { folder: UPLOAD_FOLDERS.buses, optional: true });

  upload(req, res, async (err) => {
    if (err) return; // uploadOne already handled error responses

    try {
      const { id } = req.params;
      let { busNumber, route, capacity, description, busName } = req.body;

      const bus = await Bus.findById(id);
      if (!bus) return res.status(404).json({ message: "Bus not found" });

      if (busNumber) {
        const normalized = busNumber.trim().toUpperCase();
        if (normalized !== bus.busNumber) {
          const dup = await Bus.findOne({ busNumber: normalized, _id: { $ne: bus._id } });
          if (dup)
            return res.status(409).json({ message: "Bus number already exists" });
          bus.busNumber = normalized;
        }
      }

      if (capacity !== undefined) {
        const capNum = Number(capacity);
        if (!Number.isFinite(capNum) || capNum <= 0) {
          return res
            .status(400)
            .json({ message: "capacity must be a positive number" });
        }
        bus.capacity = capNum;
      }

      if (route) bus.route = route;
      if (description !== undefined) bus.description = description.trim();
      if (busName !== undefined) bus.busName = busName.trim();

      if (req.file) {
        if (bus.imagePublicId) {
          await destroyCloudinary(bus.imagePublicId);
        }
        bus.image = req.file.path;
        bus.imagePublicId = req.file.filename;
      }

      await bus.save();
      return res.status(200).json({ message: "Bus updated", bus });
    } catch (error) {
      console.error("updateBus error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
};


// Delete bus (removes Cloudinary image)
export const deleteBus = async (req, res) => {
  try {
    const { id } = req.params;
    const bus = await Bus.findById(id);
    if (!bus) return res.status(404).json({ message: "Bus not found" });

    if (bus.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(bus.imagePublicId);
      } catch (e) {
        console.warn("Cloudinary destroy failed:", e.message);
      }
    }

    await bus.deleteOne();
    res.status(200).json({ message: "Bus deleted" });
  } catch (error) {
    console.error("deleteBus error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
