import { verifyToken } from "../utils/jsonweb.token.js";

const authenticated = (req, res, next) => {
  const accessToken = req.cookies?.access_token;
  if (!accessToken) return res.status(401).json({ message: "Unauthorized" });

  const decoded = verifyToken(accessToken);
  if (!decoded) return res.status(401).json({ message: "Invalid token" });

  req.user = decoded;
  next();
};
export default authenticated;
