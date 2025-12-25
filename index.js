const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

// --- FIX CORS HERE ---
app.use(
  cors({
    origin: "https://agrocenter.onrender.com", // your React frontend URL
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

// Start server
app.listen(5000, () => console.log("Server running on port 5000"));

