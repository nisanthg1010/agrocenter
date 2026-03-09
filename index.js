const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const ensureDefaultUsers = require("./utils/ensureDefaultUsers");

dotenv.config();
connectDB();

const app = express();

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
  })
);

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes")); //user login
app.use("/api/products", require("./routes/productRoutes")); //product 
app.use("/api/orders", require("./routes/orderRoutes")); //order
app.use("/api/users", require("./routes/userRoutes"));//user CRUD




// Test route
app.get("/", (req, res) => {
  res.send("API Running");
});

// Seed default users then start server
ensureDefaultUsers()
  .catch((err) => console.error("Default user seed failed:", err))
  .finally(() => {
    app.listen(5000, () => console.log("Server running on port 5000"));
  });
