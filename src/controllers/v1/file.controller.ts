import { Request, Response, NextFunction } from "express";
import {
  sendSuccessResponse,
  sendErrorResponse,
  HttpStatusCodes as SERVER_STATUS_CODES,
} from "../../utils/shared-lib-imports";
import { fileStorageService } from "@/services/file-storage.service";
import { s3Service } from "@/services/s3.service";
import {
  UploadFileRequest,
  GetFilesRequest,
  BulkDeleteRequest,
  BulkUploadRequest,
  FileMetadataItem,
} from "@/types/file.types";
import axios from "axios";

/**
 * File Upload Controller
 * Handles file upload requests with multipart/form-data
 */
export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;
    if (!file) {
      return sendErrorResponse(
        res,
        "No file provided",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    const { 
      category, 
      tags, 
      description, 
      isPublic, 
      expiresAt, 
      subject, 
      grade,
      isSyllabus
    } = req.body as UploadFileRequest;

    // Get user info from auth middleware or request body when auth is disabled
    const userId = (req as any).user?.id || req.body.userId;
    const tenantId = (req as any).user?.tenantId || req.body.tenantId;

    // Extract tenantName from JWT token if not available in req.user
    let tenantName = (req as any).user?.tenantName || req.body.tenantName;

    if (!tenantName) {
      // Try to extract from Authorization header
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const jwtHelper = require("../../config/auth.config").jwtHelper;
          const decoded = jwtHelper.verifyAccessToken(token);

          tenantName = decoded.tenantName || "Default Tenant";
        } catch (error: any) {
          console.log("🔧 Debug: JWT extraction error:", error.message);
          tenantName = "Default Tenant";
        }
      } else {
        tenantName = "Default Tenant";
      }
    }

    if (!userId) {
      return sendErrorResponse(
        res,
        "User ID is required (either from authentication or request body)",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    // Parse tags if provided as string
    let parsedTags: string[] | undefined;
    if (tags) {
      try {
        parsedTags =
          typeof tags === "string"
            ? JSON.parse(tags)
            : Array.isArray(tags)
            ? tags
            : [tags as string];
      } catch (error) {
        parsedTags = Array.isArray(tags) ? tags : [tags as string];
      }
    }

    // Parse expiresAt if provided
    let parsedExpiresAt: Date | undefined;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime())) {
        return sendErrorResponse(
          res,
          "Invalid expiration date format",
          SERVER_STATUS_CODES.BAD_REQUEST,
          {}
        );
      }
    }

    // Parse isSyllabus flag
    const parsedIsSyllabus = isSyllabus === "true" || isSyllabus === true;

    const uploadedFile = await fileStorageService.uploadFile(
      file,
      userId,
      tenantId,
      tenantName,
      category,
      parsedTags,
      description,
      isPublic === "true" || isPublic === true,
      parsedExpiresAt,
      subject,
      grade,
      parsedIsSyllabus
    );

    // Ensure frontend receives a stable fileId in response
    const fileId =
      (uploadedFile as any)?.id ||
      (uploadedFile as any)?._id?.toString?.() ||
      (typeof (uploadedFile as any)?._id === "string"
        ? (uploadedFile as any)._id
        : undefined);

    // Check if tags contain "content-library" and call AI API
    if (
      parsedTags &&
      Array.isArray(parsedTags) &&
      parsedTags.some(
        (tag) => tag.toLowerCase() === "content-library"
      )
    ) {
      try {
        const s3Url = (uploadedFile as any)?.s3Url;
        const fileName = (uploadedFile as any)?.fileName || (uploadedFile as any)?.originalName;
        const subject = (uploadedFile as any)?.subject;
        const grade = (uploadedFile as any)?.grade;
        
        if (fileId && s3Url && fileName && subject && grade) {
          // Get AI API URL and endpoint from environment variables or use defaults
          const aiApiUrl =
            process.env.BASE_URL || "http://localhost:3005";
          const aiApiEndpointPath =
            process.env.AI_API_CONTENT_LIBRARY_ENDPOINT ||
            "/ai/api/v1/content-library/process";
          const aiApiEndpoint = `${aiApiUrl}${aiApiEndpointPath}`;

          await axios.post(
            aiApiEndpoint,
            {
              file_id: fileId,
              file_name: fileName,
              s3_url: s3Url,
              subject: subject,
              grade: grade,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 30000, // 30 seconds timeout
            }
          );
        }
      } catch (error: any) {
      }
    }

    return res.status(SERVER_STATUS_CODES.OK).json({
      success: true,
      code: SERVER_STATUS_CODES.OK,
      message: "File uploaded successfully",
      data: {
        fileId,
        file: uploadedFile,
      },
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("File upload error:", error);

    if (errorMessage.includes("File size exceeds")) {
      return sendErrorResponse(
        res,
        errorMessage,
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    if (
      errorMessage.includes("File type") &&
      errorMessage.includes("not allowed")
    ) {
      return sendErrorResponse(
        res,
        errorMessage,
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    return sendErrorResponse(
      res,
      "Failed to upload file",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * Bulk File Upload Controller
 * Handles multiple file upload requests with multipart/form-data
 */
export const bulkUploadFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Handle files from upload.any() - extract all files from req.files array
    // Files can come with field names like "files", "files[]", etc.
    const requestFiles = (req.files as Express.Multer.File[]) || [];
    // Filter to get only actual file uploads (not text fields)
    const files: Express.Multer.File[] = requestFiles.filter(
      (file): file is Express.Multer.File => 
        file && typeof file === 'object' && 'fieldname' in file && 'originalname' in file
    );
    
    if (!files || files.length === 0) {
      return sendErrorResponse(
        res,
        "No files provided",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    const {
      metadata,
      category,
      tags,
      description,
      isPublic,
      expiresAt,
      subject,
      grade,
      isSyllabus,
    } = req.body as BulkUploadRequest;

    // Get user info from auth middleware or request body when auth is disabled
    const userId = (req as any).user?.id || req.body.userId;
    const tenantId = (req as any).user?.tenantId || req.body.tenantId;

    // Extract tenantName from JWT token if not available in req.user
    let tenantName = (req as any).user?.tenantName || req.body.tenantName;

    if (!tenantName) {
      // Try to extract from Authorization header
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const jwtHelper = require("../../config/auth.config").jwtHelper;
          const decoded = jwtHelper.verifyAccessToken(token);

          tenantName = decoded.tenantName || "Default Tenant";
        } catch (error: any) {
          console.log("🔧 Debug: JWT extraction error:", error.message);
          tenantName = "Default Tenant";
        }
      } else {
        tenantName = "Default Tenant";
      }
    }

    if (!userId) {
      return sendErrorResponse(
        res,
        "User ID is required (either from authentication or request body)",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    // Parse metadata array if provided
    let parsedMetadata: FileMetadataItem[] | undefined;
    if (metadata) {
      try {
        parsedMetadata =
          typeof metadata === "string"
            ? JSON.parse(metadata)
            : Array.isArray(metadata)
            ? metadata
            : undefined;

        if (!Array.isArray(parsedMetadata)) {
          parsedMetadata = undefined;
        }
      } catch (error) {
        console.error("Failed to parse metadata:", error);
        parsedMetadata = undefined;
      }
    }

    // If metadata array is provided, validate it matches file count
    if (parsedMetadata && parsedMetadata.length !== files.length) {
      return sendErrorResponse(
        res,
        `Metadata array length (${parsedMetadata.length}) must match files count (${files.length})`,
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    // Parse isSyllabus flag (can be per-file in metadata or global)
    const globalIsSyllabus = isSyllabus === "true" || isSyllabus === true;

    // Prepare per-file metadata array
    const filesMetadata = files.map((file, index) => {
      const fileMeta = parsedMetadata?.[index] || {};

      // Parse tags for this file
      let parsedTags: string[] | undefined;
      const fileTags = fileMeta.tags || (parsedMetadata ? undefined : tags);
      if (fileTags) {
        try {
          parsedTags =
            typeof fileTags === "string"
              ? JSON.parse(fileTags)
              : Array.isArray(fileTags)
              ? fileTags
              : [fileTags as string];
        } catch (error) {
          parsedTags = Array.isArray(fileTags) ? fileTags : [fileTags as string];
        }
      }

      // Parse expiresAt for this file
      let parsedExpiresAt: Date | undefined;
      const fileExpiresAt = fileMeta.expiresAt || (parsedMetadata ? undefined : expiresAt);
      if (fileExpiresAt) {
        parsedExpiresAt = new Date(fileExpiresAt);
        if (isNaN(parsedExpiresAt.getTime())) {
          // Return error response for invalid date
          throw new Error(`Invalid expiration date format for file ${index + 1} (${file.originalname})`);
        }
      }

      // Parse isSyllabus for this file (per-file metadata takes precedence)
      const fileIsSyllabus = fileMeta.isSyllabus !== undefined
        ? fileMeta.isSyllabus === "true" || fileMeta.isSyllabus === true
        : parsedMetadata
        ? undefined
        : globalIsSyllabus;

      return {
        category: fileMeta.category || (parsedMetadata ? undefined : category),
        tags: parsedTags,
        description: fileMeta.description || (parsedMetadata ? undefined : description),
        isPublic:
          fileMeta.isPublic !== undefined
            ? fileMeta.isPublic === "true" || fileMeta.isPublic === true
            : parsedMetadata
            ? false
            : isPublic === "true" || isPublic === true,
        expiresAt: parsedExpiresAt,
        subject: fileMeta.subject || (parsedMetadata ? undefined : subject),
        grade: fileMeta.grade || (parsedMetadata ? undefined : grade),
        isSyllabus: fileIsSyllabus,
      };
    });

    const uploadedFiles = await fileStorageService.bulkUploadFiles(
      files,
      userId,
      tenantId,
      tenantName,
      filesMetadata
    );

    // Extract file IDs from uploaded files
    const fileIds = uploadedFiles.map((file) => {
      return (
        (file as any)?.id ||
        (file as any)?._id?.toString?.() ||
        (typeof (file as any)?._id === "string"
          ? (file as any)._id
          : undefined)
      );
    });

    // Check if any file has "content-library" tag and call AI API for those files
    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadedFile = uploadedFiles[i];
      const fileMetadata = filesMetadata[i];
      const fileTags = fileMetadata?.tags || [];

      // Check if this file has content-library tag
      if (
        Array.isArray(fileTags) &&
        fileTags.some((tag) => tag.toLowerCase() === "content-library")
      ) {
        try {
          const fileId =
            (uploadedFile as any)?.id ||
            (uploadedFile as any)?._id?.toString?.() ||
            (typeof (uploadedFile as any)?._id === "string"
              ? (uploadedFile as any)._id
              : undefined);
          const s3Url = (uploadedFile as any)?.s3Url;
          const fileName =
            (uploadedFile as any)?.fileName ||
            (uploadedFile as any)?.originalName;
          const subject = (uploadedFile as any)?.subject;
          const grade = (uploadedFile as any)?.grade;

          if (fileId && s3Url && fileName && subject && grade) {
            // Get AI API URL and endpoint from environment variables or use defaults
            const aiApiUrl =
              process.env.BASE_URL || "http://localhost:3005";
            const aiApiEndpointPath =
              process.env.AI_API_CONTENT_LIBRARY_ENDPOINT ||
              "/ai/api/v1/content-library/process";
            const aiApiEndpoint = `${aiApiUrl}${aiApiEndpointPath}`;

            await axios.post(
              aiApiEndpoint,
              {
                file_id: fileId,
                file_name: fileName,
                s3_url: s3Url,
                subject: subject,
                grade: grade,
              },
              {
                headers: {
                  "Content-Type": "application/json",
                },
                timeout: 30000, // 30 seconds timeout
              }
            );
          }
        } catch (error: any) {
          // Continue processing other files even if AI API call fails
          console.error("AI API call failed for file:", error);
        }
      }
    }

    return res.status(SERVER_STATUS_CODES.OK).json({
      success: true,
      code: SERVER_STATUS_CODES.OK,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: {
        uploadedCount: uploadedFiles.length,
        fileIds,
        files: uploadedFiles,
      },
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Bulk file upload error:", error);

    if (errorMessage.includes("File size exceeds")) {
      return sendErrorResponse(
        res,
        errorMessage,
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    if (
      errorMessage.includes("File type") &&
      errorMessage.includes("not allowed")
    ) {
      return sendErrorResponse(
        res,
        errorMessage,
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    return sendErrorResponse(
      res,
      "Failed to upload files",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * Public File Download Controller
 * Generates presigned URL for public file download (no auth required)
 */
export const downloadPublicFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.error("🔓 [STORAGE API] downloadPublicFile called:", {
      fileId: req.params.fileId,
      fullPath: req.path,
      originalUrl: req.originalUrl,
      method: req.method,
    });

    const { fileId } = req.params;

    if (!fileId) {
      return sendErrorResponse(
        res,
        "File ID is required",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    const downloadUrl = await fileStorageService.generatePublicDownloadUrl(
      fileId
    );

    return sendSuccessResponse(res, "Download URL generated successfully", {
      downloadUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Public file download error:", error);

    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("access denied")
    ) {
      return sendErrorResponse(
        res,
        errorMessage,
        SERVER_STATUS_CODES.NOT_FOUND,
        {}
      );
    }

    return sendErrorResponse(
      res,
      "Failed to generate download URL",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * File Download Controller
 * Generates presigned URL for file download
 */
export const downloadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (!fileId) {
      return sendErrorResponse(
        res,
        "File ID is required",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    const downloadUrl = await fileStorageService.generateDownloadUrl(
      fileId,
      userId,
      tenantId
    );

    return sendSuccessResponse(res, "Download URL generated successfully", {
      downloadUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("File download error:", error);

    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("access denied")
    ) {
      return sendErrorResponse(
        res,
        errorMessage,
        SERVER_STATUS_CODES.NOT_FOUND,
        {}
      );
    }

    return sendErrorResponse(
      res,
      "Failed to generate download URL",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * Get File by ID Controller
 * Returns file metadata
 */
export const getFileById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user?.id;
    let tenantId = (req as any).user?.tenantId;

    // Handle tenantId if it's a JSON object string (extract the id field)
    if (tenantId && typeof tenantId === "string" && tenantId.startsWith("{")) {
      try {
        // Clean up the string - remove newlines and fix formatting
        const cleanedTenantId = tenantId
          .replace(/\n/g, "")
          .replace(/\s+/g, " ");
        const tenantObj = JSON.parse(cleanedTenantId);
        tenantId = tenantObj.id || tenantObj._id;
      } catch (error) {
        console.error("Failed to parse tenantId JSON:", error);
        console.error("Raw tenantId:", tenantId);
        tenantId = undefined;
      }
    }

    if (!fileId) {
      return sendErrorResponse(
        res,
        "File ID is required",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    const file = await fileStorageService.getFileById(fileId, userId, tenantId);

    if (!file) {
      return sendErrorResponse(
        res,
        "File not found or access denied",
        SERVER_STATUS_CODES.NOT_FOUND,
        {}
      );
    }

    return sendSuccessResponse(res, "File retrieved successfully", file);
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Get file by ID error:", error);

    return sendErrorResponse(
      res,
      "Failed to retrieve file",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * Get Files by User Controller
 * Returns paginated list of user's files
 */
export const getFilesByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user info from auth middleware or URL params when auth is disabled
    const userId = (req as any).user?.id || req.params.userId;
    let tenantId =
      (req as any).user?.tenantId || (req.query.tenantId as string);

    // Handle tenantId if it's a JSON object string (extract the id field)
    if (tenantId && typeof tenantId === "string" && tenantId.startsWith("{")) {
      try {
        // Clean up the string - remove newlines and fix formatting
        const cleanedTenantId = tenantId
          .replace(/\n/g, "")
          .replace(/\s+/g, " ");
        const tenantObj = JSON.parse(cleanedTenantId);
        tenantId = tenantObj.id || tenantObj._id;
      } catch (error) {
        console.error("Failed to parse tenantId JSON:", error);
        console.error("Raw tenantId:", tenantId);
        tenantId = undefined;
      }
    }

    const {
      page = 1,
      limit = 20,
      category,
      tags,
    } = req.query as GetFilesRequest;

    if (!userId) {
      return sendErrorResponse(
        res,
        "User ID is required (either from authentication or URL parameter)",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    const result = await fileStorageService.getFilesByUser(
      userId,
      tenantId,
      parseInt(page as string),
      parseInt(limit as string),
      category,
      tags ? (typeof tags === "string" ? [tags] : tags) : undefined
    );

    return sendSuccessResponse(res, "Files retrieved successfully", result);
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Get files by user error:", error);

    return sendErrorResponse(
      res,
      "Failed to retrieve files",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * Get Files by Tenant Controller
 * Returns paginated list of tenant's files
 */
export const getFilesByTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantId } = req.params;
    const userId = (req as any).user?.id;

    const {
      page = 1,
      limit = 20,
      category,
      tags,
    } = req.query as GetFilesRequest;

    if (!tenantId) {
      return sendErrorResponse(
        res,
        "Tenant ID is required",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    const result = await fileStorageService.getFilesByTenant(
      tenantId,
      parseInt(page as string),
      parseInt(limit as string),
      category,
      tags ? (typeof tags === "string" ? [tags] : tags) : undefined
    );

    return sendSuccessResponse(res, "Files retrieved successfully", result);
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Get files by tenant error:", error);

    return sendErrorResponse(
      res,
      "Failed to retrieve files",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * Delete File Controller
 * Deletes a single file
 */
export const deleteFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (!fileId) {
      return sendErrorResponse(
        res,
        "File ID is required",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    await fileStorageService.deleteFile(fileId, userId, tenantId);

    return sendSuccessResponse(res, "File deleted successfully", { fileId });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Delete file error:", error);

    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("access denied")
    ) {
      return sendErrorResponse(
        res,
        errorMessage,
        SERVER_STATUS_CODES.NOT_FOUND,
        {}
      );
    }

    return sendErrorResponse(
      res,
      "Failed to delete file",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * Bulk Delete Files Controller
 * Deletes multiple files
 */
export const bulkDeleteFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileIds } = req.body as BulkDeleteRequest;
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return sendErrorResponse(
        res,
        "File IDs array is required",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    await fileStorageService.bulkDeleteFiles(fileIds, userId, tenantId);

    return sendSuccessResponse(res, "Files deleted successfully", {
      deletedCount: fileIds.length,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Bulk delete files error:", error);

    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("access denied")
    ) {
      return sendErrorResponse(
        res,
        errorMessage,
        SERVER_STATUS_CODES.NOT_FOUND,
        {}
      );
    }

    return sendErrorResponse(
      res,
      "Failed to delete files",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * Get Storage Statistics Controller
 * Returns storage usage statistics
 */
export const getStorageStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    const stats = await fileStorageService.getStorageStats(tenantId, userId);

    return sendSuccessResponse(
      res,
      "Storage statistics retrieved successfully",
      stats
    );
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Get storage stats error:", error);

    return sendErrorResponse(
      res,
      "Failed to retrieve storage statistics",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

/**
 * Generate Presigned Upload URL Controller
 * Generates presigned URL for direct client uploads
 */
export const generatePresignedUploadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileName, contentType } = req.body;
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;
    const tenantName = (req as any).user?.tenantName;

    if (!fileName || !contentType) {
      return sendErrorResponse(
        res,
        "File name and content type are required",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    const result = await s3Service.generatePresignedUploadUrl(
      fileName,
      contentType,
      tenantName,
      userId
    );

    return sendSuccessResponse(
      res,
      "Presigned upload URL generated successfully",
      result
    );
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Generate presigned upload URL error:", error);

    return sendErrorResponse(
      res,
      "Failed to generate presigned upload URL",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

export const downloadFileFromUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileUrl } = req.query;

    if (!fileUrl) {
      return sendErrorResponse(
        res,
        "File URL is required.",
        SERVER_STATUS_CODES.BAD_REQUEST,
        {}
      );
    }

    const response = await fileStorageService.downloadFileFromUrl(
      fileUrl as string
    );

    res.setHeader("Content-Disposition", `attachment; filename="file"`);
    response.data.pipe(res);
  } catch (error) {
    const errorMessage = (error as Error).message;
    return sendErrorResponse(
      res,
      "Error downloading the file.",
      SERVER_STATUS_CODES.INTERNAL_SERVER_ERROR,
      { error: errorMessage }
    );
  }
};

