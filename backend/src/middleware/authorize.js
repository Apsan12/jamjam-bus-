const authorization = (roles = []) => {
  // roles param can be a single role string (e.g. 'admin')
  // or an array of roles (e.g. ['admin', 'user'])
  if (typeof roles === "string") {
    roles = [roles];
  }

  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) return res.status(401).json({ message: "Unauthorized" });

    const hasAccess = roles.includes(userRole);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    next();
  };
};
export default authorization;
