const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload");
const { protect } = require("../middlewares/auth");
const { adminOnly } = require("../middlewares/admin");
const c = require("../controllers/adminController");
const { getuser, listUsers, updateUserRole, deleteUser } = require("../controllers/admin");

// ---------- Public reads (shown on the website) ----------
router.get("/get-products", c.getProducts);
router.get("/get-team-member", c.getTeams);
router.get("/get-sponsors", c.getSponsors);
router.get("/get-sliders", c.getSliders);
router.get("/get-videos", c.getVideos);

// ---------- Admin only (login + admin role required) ----------
router.get("/getuser", protect, adminOnly, getuser);

// Users
router.get("/users", protect, adminOnly, listUsers);
router.patch("/users/:id/role", protect, adminOnly, updateUserRole);
router.delete("/users/:id", protect, adminOnly, deleteUser);

// Product
router.post("/add-product", protect, adminOnly, upload.single("image"), c.addProduct);
router.delete("/delete-product/:id", protect, adminOnly, c.deleteProduct);
router.put("/update-product/:id", protect, adminOnly, upload.single("image"), c.updateProduct);

// Team
router.post("/add-team-member", protect, adminOnly, upload.single("image"), c.addTeam);
router.delete("/delete-team-member/:id", protect, adminOnly, c.deleteTeam);
router.put("/update-team-member/:id", protect, adminOnly, upload.single("image"), c.updateTeam);

// Sponsor
router.post("/add-sponsor", protect, adminOnly, upload.single("image"), c.addSponsor);
router.delete("/delete-sponsor/:id", protect, adminOnly, c.deleteSponsor);
router.put("/update-sponsor/:id", protect, adminOnly, upload.single("image"), c.updateSponsor);

// Slider
router.post("/add-slider", protect, adminOnly, upload.single("image"), c.addSlider);
router.delete("/delete-slider/:id", protect, adminOnly, c.deleteSlider);
router.put("/update-slider/:id", protect, adminOnly, upload.single("image"), c.updateSlider);

// Video
router.post("/add-video", protect, adminOnly, c.addVideo);
router.delete("/delete-video/:id", protect, adminOnly, c.deleteVideo);
router.put("/update-video/:id", protect, adminOnly, c.updateVideo);

module.exports = router;
