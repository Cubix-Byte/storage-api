import { Router } from "express";
import fileRoutes from "./file.routes";
import { ROUTES } from "../utils/constants/routes";

// Main router - combines all route modules
const router = Router();

// Health check endpoint
router.get(ROUTES.HEALTH.BASE, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Storage API is running",
    timestamp: new Date().toISOString(),
    service: "storage-api",
    version: "1.0.0"
  });
});

// File management routes (protected by global auth middleware)
router.use(ROUTES.FILES.BASE, fileRoutes);

export default router;
