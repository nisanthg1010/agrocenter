const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const ensureDefaultUsers = require("./utils/ensureDefaultUsers");

dotenv.config();

const app = express();
const isServerless = Boolean(process.env.VERCEL);

const initApp = async () => {
  await connectDB();

  // Seeding should run only on long-lived server startup, not on serverless invocations.
  if (!isServerless) {
    await ensureDefaultUsers();
  }
};

const initPromise = initApp().catch((error) => {
  console.error("App initialization failed:", error);
  throw error;
});

// --- CORS Configuration ---
const allowedOrigins = [
  "http://localhost:5173",
  "https://agrocenter-frontend.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(async (req, res, next) => {
  try {
    await initPromise;
    next();
  } catch (error) {
    res.status(500).json({ message: "Server initialization failed" });
  }
});

// Routes
app.use("/api/auth", require("./routes/authRoutes")); //user login
app.use("/api/products", require("./routes/productRoutes")); //product 
app.use("/api/orders", require("./routes/orderRoutes")); //order
app.use("/api/users", require("./routes/userRoutes"));//user CRUD
app.use("/api/ai", require("./routes/aiRoutes")); // AI proxy




// Test route
app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 5000;

if (!isServerless && require.main === module) {
  initPromise
    .catch(() => {
      // Keep running so startup error is visible in logs and app can recover on retry.
    })
    .finally(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    });
}

module.exports = app;
