import { config as envConfig } from "dotenv";
envConfig();

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// Validate env
[
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
].forEach((k) => {
  if (!process.env[k]) {
    console.warn(`[multer] Missing env var: ${k}`);
  }
});

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer (memory) + strict file filter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) return cb(null, true);
    const err = new Error("Invalid file type");
    err.code = "INVALID_FILE_TYPE";
    cb(err);
  },
});

// Cloudinary upload helper (Buffer -> Cloudinary)
export const uploadImageBuffer = (fileBuffer, folder = "gobus_uploads") =>
  new Promise((resolve, reject) => {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      const err = new Error("No file buffer provided");
      err.code = "NO_FILE_BUFFER";
      return reject(err);
    }
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ width: 1000, crop: "limit" }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(fileBuffer);
  });

// Express error handler for multer/cloudinary
export const uploadErrorHandler = (err, _req, res, next) => {
  if (!err) return next();
  // Multer errors
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res
          .status(400)
          .json({ message: `File too large. Max ${MAX_FILE_SIZE_MB}MB` });
      case "LIMIT_UNEXPECTED_FILE":
      case "LIMIT_PART_COUNT":
      case "LIMIT_FILE_COUNT":
      case "LIMIT_FIELD_KEY":
      case "LIMIT_FIELD_VALUE":
      case "LIMIT_FIELD_COUNT":
        return res.status(400).json({ message: "Invalid upload request" });
      default:
        return res.status(400).json({ message: "Upload error" });
    }
  }
  // Custom filter error
  if (err.code === "INVALID_FILE_TYPE") {
    return res
      .status(400)
      .json({ message: "Only PNG, JPG, JPEG, WEBP allowed" });
  }
  if (err.code === "NO_FILE_BUFFER") {
    return res.status(400).json({ message: "No file received" });
  }
  // Cloudinary or unknown
  return res.status(502).json({ message: "Image service error" });
};

export const UPLOAD_FOLDERS = {
  buses: "gobus_buses",
  routes: "gobus_routes",
  avatars: "gobus_avatars",
  general: "gobus_uploads",
};

// Convenience: single-file uploader with required/optional control
export const uploadOne = (
  fieldName,
  { folder = UPLOAD_FOLDERS.general, optional = false } = {}
) => {
  const middleware = upload.single(fieldName);
  return async (req, res, next) => {
    middleware(req, res, async (err) => {
      if (err) return uploadErrorHandler(err, req, res, next);
      if (!optional && !req.file) {
        return res
          .status(400)
          .json({ message: `Image field '${fieldName}' is required` });
      }
      // If a buffer exists, upload to Cloudinary now and attach result
      if (req.file?.buffer) {
        try {
          const r = await uploadImageBuffer(req.file.buffer, folder);
          // Attach Cloudinary results (consistent with multer-storage-cloudinary fields)
          req.file.path = r.secure_url;
          req.file.filename = r.public_id;
        } catch (e) {
          return uploadErrorHandler(e, req, res, next);
        }
      }
      next();
    });
  };
};

// Multi-field helper (reuse for user avatar + route map, etc.)
export const uploadFor = (fields = []) => {
  // fields: [{ name, folder, required? }]
  const multerFields = fields.map((f) => ({ name: f.name, maxCount: 1 }));
  const mw = upload.fields(multerFields);

  return async (req, res, next) => {
    mw(req, res, async (err) => {
      if (err) return uploadErrorHandler(err, req, res, next);

      // Validate required fields
      for (const f of fields) {
        if (f.required && !req.files?.[f.name]?.[0]) {
          return res
            .status(400)
            .json({ message: `Image field '${f.name}' is required` });
        }
      }

      req.uploads = req.uploads || {};
      // Upload each provided file buffer to its target folder
      try {
        for (const f of fields) {
          const file = req.files?.[f.name]?.[0];
          if (!file?.buffer) continue;
          const folder = f.folder || UPLOAD_FOLDERS.general;
          const r = await uploadImageBuffer(file.buffer, folder);
          // Mirror single-file fields and also expose a simple map
          file.path = r.secure_url;
          file.filename = r.public_id;
          req.uploads[f.name] = { url: r.secure_url, publicId: r.public_id };
        }
        return next();
      } catch (e) {
        return uploadErrorHandler(e, req, res, next);
      }
    });
  };
};

// Optional: simple destroy helper
export const destroyCloudinary = async (publicId) => {
  if (!publicId) return false;
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res?.result === "ok" || res?.result === "not found";
  } catch {
    return false;
  }
};

export { upload, cloudinary };
