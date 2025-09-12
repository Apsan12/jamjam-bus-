import Bus from "../model/bus.model.js";
import { v2 as cloudinary } from "cloudinary";

// Create Bus
export const createBus = async (req, res) => {
  try {
    let { busNumber, route, capacity } = req.body;

    if (!busNumber || !route || !capacity) {
      return res
        .status(400)
        .json({ message: "busNumber, route, capacity are required" });
    }

    capacity = Number(capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return res
        .status(400)
        .json({ message: "capacity must be a positive number" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    // Normalize busNumber (optional)
    const normalizedBusNumber = busNumber.trim().toUpperCase();

    const exists = await Bus.findOne({ busNumber: normalizedBusNumber });
    if (exists) {
      return res.status(409).json({ message: "Bus number already exists" });
    }

    const newBus = await Bus.create({
      busNumber: normalizedBusNumber,
      route,
      capacity,
      imageUrl: req.file.path,
      imagePublicId: req.file.filename,
    });

    res.status(201).json({ message: "Bus created", bus: newBus });
  } catch (error) {
    console.error("createBus error:", error);
    res.status(500).json({ message: "Server error" });
  }
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
export const updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    let { busNumber, route, capacity } = req.body;

    const bus = await Bus.findById(id);
    if (!bus) return res.status(404).json({ message: "Bus not found" });

    if (busNumber) {
      const normalized = busNumber.trim().toUpperCase();
      if (normalized !== bus.busNumber) {
        const duplicate = await Bus.findOne({ busNumber: normalized });
        if (duplicate) {
          return res.status(409).json({ message: "Bus number already exists" });
        }
        bus.busNumber = normalized;
      }
    }

    if (capacity !== undefined) {
      const numCap = Number(capacity);
      if (!Number.isFinite(numCap) || numCap <= 0) {
        return res.status(400).json({ message: "capacity must be positive" });
      }
      bus.capacity = numCap;
    }

    if (route) bus.route = route;

    // New image uploaded?
    if (req.file) {
      // Remove old image if present
      if (bus.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(bus.imagePublicId);
        } catch (e) {
          console.warn("Cloudinary destroy failed:", e.message);
        }
      }
      bus.imageUrl = req.file.path;
      bus.imagePublicId = req.file.filename;
    }

    await bus.save();
    res.status(200).json({ message: "Bus updated", bus });
  } catch (error) {
    console.error("updateBus error:", error);
    res.status(500).json({ message: "Server error" });
  }
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
