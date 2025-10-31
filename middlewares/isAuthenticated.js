const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    if (!req.headers.authorization)
      return res.status(401).json({ message: "Unauthorized" });
    const token = req.headers.authorization.replace("Bearer ", "");
    const foundUser = await User.findOne({ token: token });
    if (!foundUser) return res.status(401).json({ message: "Unauthorized" });
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = isAuthenticated;
