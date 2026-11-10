const mongoose = require("mongoose");
const usermodel = require("../models/User");
const Order = require("../models/Order");

const HIDDEN = "-password -firebaseUid";

// Kept for backwards compatibility with the old route
const getuser = async (req, res) => {
  try {
    const user = await usermodel.find().select(HIDDEN);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("error during fetching admin data", error);
    res.status(500).json({ success: false, message: "Server error during fetching admin data" });
  }
};

// GET /admin/users : every user with their order count and total spent
const listUsers = async (req, res) => {
  try {
    const users = await usermodel.find().select(HIDDEN).sort({ createdAt: -1 }).lean();
    const stats = await Order.aggregate([
      {
        $group: {
          _id: "$userId",
          orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 0, "$totalAmount"] } },
        },
      },
    ]);
    const byUser = new Map(stats.map((s) => [String(s._id), s]));
    res.json(
      users.map((u) => ({
        ...u,
        orders: byUser.get(String(u._id))?.orders || 0,
        spent: byUser.get(String(u._id))?.spent || 0,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while loading users" });
  }
};

// PATCH /admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body || {};
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });
    if (!["user", "admin"].includes(role)) return res.status(400).json({ message: "Role must be user or admin" });
    if (id === req.user.id) return res.status(400).json({ message: "You cannot change your own role" });

    const target = await usermodel.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.role === "admin" && role === "user") {
      const admins = await usermodel.countDocuments({ role: "admin" });
      if (admins <= 1) return res.status(400).json({ message: "At least one admin must remain" });
    }

    target.role = role;
    await target.save();
    res.json({ message: `${target.username} is now ${role}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while updating the role" });
  }
};

// DELETE /admin/users/:id  (their past orders are kept for your records)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });
    if (id === req.user.id) return res.status(400).json({ message: "You cannot delete your own account" });

    const target = await usermodel.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.role === "admin") {
      const admins = await usermodel.countDocuments({ role: "admin" });
      if (admins <= 1) return res.status(400).json({ message: "At least one admin must remain" });
    }

    await target.deleteOne();
    res.json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while deleting the user" });
  }
};

module.exports = { getuser, listUsers, updateUserRole, deleteUser };
