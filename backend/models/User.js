const mongoose = require("mongoose");

const userschema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, unique: true, required: true, trim: true },
    // Login is handled by Firebase. Old accounts may still carry a legacy password hash, which is no longer used.
    password: { type: String },
    firebaseUid: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["user", "admin"], default: "user", required: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Collection name stays "users" so your existing data keeps working
module.exports = mongoose.model("user", userschema);
