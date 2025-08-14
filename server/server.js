const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy setting for proper rate limiting
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    // Try Atlas connection first, then fallback to local
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/tariffwizard";

    await mongoose.connect(mongoURI, connectionOptions);
    console.log("✅ MongoDB connected successfully");
    console.log(
      `📍 Connected to: ${
        mongoURI.includes("mongodb.net") ? "MongoDB Atlas" : "Local MongoDB"
      }`
    );
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);

    if (error.message.includes("IP")) {
      console.log("\n🚨 MongoDB Atlas IP Whitelist Issue:");
      console.log("1. Go to https://cloud.mongodb.com/");
      console.log("2. Navigate to Network Access");
      console.log(
        "3. Add your current IP address or use 0.0.0.0/0 for development"
      );
      console.log("4. Save and wait 1-2 minutes for changes to take effect");
    }

    console.log("\n💡 Alternative: Use local MongoDB:");
    console.log("1. Install MongoDB locally");
    console.log("2. Remove MONGODB_URI from environment variables");
    console.log("3. Restart the server");

    // Don't exit in development, let the server run without DB
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};

connectDB();

// Routes
app.use("/api/hscodes", require("./routes/hsCodes"));
app.use("/api/countries", require("./routes/countries"));
app.use("/api/exemptions", require("./routes/exemptions"));
app.use("/api/materials", require("./routes/materials"));
app.use("/api/metals", require("./routes/metals"));
app.use("/api/specialrates", require("./routes/specialRates"));
app.use("/api/calculator", require("./routes/calculator"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === "production") {
  // Serve static files
  app.use(express.static(path.join(__dirname, "../client/build")));

  // Handle React routing, return all requests to React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
} else {
  // 404 handler for development
  app.use("*", (req, res) => {
    res.status(404).json({ error: "Route not found" });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
