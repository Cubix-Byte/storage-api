import { Router } from "express";
import multer from "multer";
import * as fileController from "../controllers/v1/file.controller";
import { validate } from "../middlewares/validate.middleware";
import { uploadFileSchema } from "../utils/requestValidators/file.validator";
import { ROUTES } from "../utils/constants/routes";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "52428800"), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(",") || [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "application/vnd.ms-powerpoint", // .ppt
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "video/mp4",
      "video/webm",
      "video/quicktime", // .mov
      "video/x-msvideo", // .avi
      "video/x-matroska", // .mkv
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

// All routes use global authentication middleware - no manual auth middleware needed
// File upload route (requires authentication)
router
  .route(ROUTES.FILES.SUBROUTES.UPLOAD)
  .post(
    upload.single("file"),
    validate(uploadFileSchema),
    fileController.uploadFile
  );

// Bulk file upload route (requires authentication)
// Using any() to accept files with any field name (files, files[], etc.) and additional form fields
router
  .route(ROUTES.FILES.SUBROUTES.BULK_UPLOAD)
  .post(
    upload.any(),
    validate(uploadFileSchema),
    fileController.bulkUploadFiles
  );

// Download file from URL route (with fileUrl query parameter)
router.route("/download").get(fileController.downloadFileFromUrl);

// Public file download route (no authentication required for public files)
// Note: Route is relative to /files (where this router is mounted)
router.route("/download/public/:fileId").get(fileController.downloadPublicFile);

// Short public download route alias (shorter URL)
router.route("/d/:fileId").get(fileController.downloadPublicFile);

// File download route (requires authentication)
router.route(ROUTES.FILES.SUBROUTES.DOWNLOAD).get(fileController.downloadFile);

// Catch incorrect URL pattern: /files/:fileId/download -> handle as public download
// This route MUST come before /:fileId (GET_BY_ID) to match first
router.route("/:fileId/download").get((req, res, next) => {
  const { fileId } = req.params;
  console.error(
    "⚠️ [ROUTE FIX] Incorrect URL pattern detected, redirecting to public endpoint:",
    {
      originalPath: req.path,
      fileId,
      correctPath: `/storage/api/v1/files/download/public/${fileId}`,
    }
  );
  // Call the public download controller directly instead of redirect
  // This avoids redirect issues with API clients
  req.params.fileId = fileId; // Ensure fileId is set
  return fileController.downloadPublicFile(req, res, next);
});

// File management routes (require authentication)
router.route(ROUTES.FILES.SUBROUTES.GET_BY_ID).get(fileController.getFileById);

router
  .route(ROUTES.FILES.SUBROUTES.GET_BY_USER)
  .get(fileController.getFilesByUser);

router
  .route(ROUTES.FILES.SUBROUTES.GET_BY_TENANT)
  .get(fileController.getFilesByTenant);

router.route(ROUTES.FILES.SUBROUTES.DELETE).delete(fileController.deleteFile);

router
  .route(ROUTES.FILES.SUBROUTES.BULK_DELETE)
  .post(fileController.bulkDeleteFiles);

router
  .route(ROUTES.FILES.SUBROUTES.GET_PRESIGNED_URL)
  .get(fileController.downloadFile); // Same as download, generates presigned URL

// Storage statistics route (requires authentication)
router.route("/stats").get(fileController.getStorageStats);

// Presigned upload URL route (requires authentication)
router
  .route("/presigned-upload")
  .post(fileController.generatePresignedUploadUrl);

export default router;
