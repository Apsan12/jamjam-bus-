import { verifyToken } from "../utils/jsonweb.token.js";
import User from "../model/user.model.js";

const getAccessToken = (req) => {
  // Prefer Authorization: Bearer <token>
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  // Fallback to cookie (if you set access_token cookie)
  return req.cookies?.access_token;
};

const authenticated = async (req, res, next) => {
  try {
    const token = getAccessToken(req);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const payload = verifyToken(token);
    if (!payload?.id) return res.status(401).json({ message: "Unauthorized" });

    // Load fresh user to get role
    const user = await User.findById(payload.id).select(
      "role email username isVerified"
    );
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    // Optional: block unverified users
    // if (!user.isVerified) return res.status(403).json({ message: "Email not verified" });

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      username: user.username,
    };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default authenticated;
