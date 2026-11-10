const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getToken = (req) => {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.split(" ")[1];
  return null;
};

// Verifies the JWT, then re-checks the user (and role) in the database
const protect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("role username email");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = {
      id: user._id.toString(),
      role: user.role,
      username: user.username,
      email: user.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { protect };
