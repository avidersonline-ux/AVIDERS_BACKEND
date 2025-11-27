// middleware/auth.firebase.js

const admin = require("../config/firebase");

module.exports = async function verifyFirebaseToken(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      phone: decoded.phone_number || null,
    };

    next();
  } catch (err) {
    console.error("Firebase Auth Error:", err);
    return res.status(401).json({ message: "Invalid Token" });
  }
};
