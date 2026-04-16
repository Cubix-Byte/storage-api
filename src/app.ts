import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import morgan from "morgan";
import { ROUTES } from "./utils/constants/routes";
import {
  globalAuthMiddleware,
  debugMiddleware,
} from "./config/global-auth.config";

// Express application factory function - sets up all middleware and routes
const createApp = (): express.Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  // CORS configuration - allow all origins
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
      optionsSuccessStatus: 200,
    })
  );
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: "50mb" })); // Increased limit for file uploads
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Logger
  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  }

  // Debug middleware for file operations
  // app.use(debugMiddleware);

  // Global authentication middleware
  // Temporarily disabled for testing
  app.use(globalAuthMiddleware);

  // Health check endpoint (root level)
  app.get("/health", (req, res) => {
    res.json({
      success: true,
      message: "Storage API is running",
      timestamp: new Date().toISOString(),
      service: "storage-api",
      version: "1.0.0",
    });
  });

  // Routes with service-specific base path
  app.use(ROUTES.BASE, routes);

  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Error handling middleware
  app.use(errorHandler);

  return app;
};

export default createApp;

// V1 Final
