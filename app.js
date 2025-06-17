const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

// const { swaggerDocs } = require("./configs/swagger");
// Import routes
const authRoutes = require("./routes/authRoutes");
const classRoutes = require("./routes/classRoutes");
const materialRoutes = require("./routes/materialRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Import middleware
const { authenticate } = require("./middlewares/authMiddleware");
const { handleMulterError } = require("./middlewares/uploadMiddleware");

const app = express();

// // Security middleware
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: "cross-origin" }
// }));

const corsOptions = {
  origin: [
    'https://kelasmu-id.vercel.app',
    'http://localhost:5173',
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:5174'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// swaggerDocs(app);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "LMS Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "1.0.0",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/notifications", notificationRoutes);

// Add multer error handling middleware
app.use(handleMulterError);

// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "Welcome to HOKAV2 Learning Management System API!",
//     version: "2.0.0",
//     documentation: "/api-docs",
//     features: {
//       newFeatures: [
//         "Get grades from all classes: GET /api/assignments/classes/grades",
//         "Get grades for specific class: GET /api/assignments/classes/{classId}/grades",
//       ],
//       authentication: "JWT Bearer Token",
//       fileUpload: "Multipart form data supported",
//       realTimeNotifications: "WebSocket notifications available",
//     },
//     endpoints: {
//       health: "/health",
//       documentation: "/api-docs",
//       auth: "/api/auth",
//       classes: "/api/classes",
//       assignments: "/api/assignments",
//       materials: "/api/materials",
//       notifications: "/api/notifications",
//     },
//     quickStart: {
//       step1: "Register: POST /api/auth/register",
//       step2: "Login: POST /api/auth/login",
//       step3: "Use Bearer token in Authorization header",
//       step4: "Explore API at /api-docs",
//     },
//   });
// });

// Protected route example (untuk testing)
app.get("/api/protected", authenticate, (req, res) => {
  res.json({
    success: true,
    message: "Ini adalah route yang dilindungi!",
    user: req.user,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  // Prisma error handling
  if (error.code === "P2002") {
    return res.status(400).json({
      success: false,
      message: "Data sudah ada (duplicate entry)",
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  }

  // JWT error handling
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Token tidak valid",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token sudah kadaluarsa",
    });
  }

  // Validation error
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Data tidak valid",
      errors: Object.values(error.errors).map((err) => err.message),
    });
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

module.exports = app;
