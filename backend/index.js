require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { injectSpeedInsights } = require("@vercel/speed-insights");
const connectDB = require("./utils/db");
const migrateStock = require("./utils/migrate");
const { stripeWebhook } = require("./controllers/orderController");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in backend/.env. The server cannot start without it.");
  process.exit(1);
}

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const orderRoutes = require("./routes/order");

const app = express();
const port = process.env.PORT || 4000;
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

connectDB()
  .then(migrateStock)
  .catch((err) => console.error("Startup migration failed:", err));

// Initialize Vercel Speed Insights
injectSpeedInsights();

// --- MIDDLEWARE ---
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
// Stripe signs the RAW request body, so this route must come BEFORE express.json()
app.post("/order/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Uploaded images are public: http://localhost:4000/uploads/<file>
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- ROUTES ---
app.get("/", (req, res) => res.send("Agro-IntelliSense Backend is running!"));
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/order", orderRoutes);

// --- ERRORS ---
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ error: "Image is too large (max 5 MB)" });
  if (err.message === "Only image files are allowed")
    return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});
