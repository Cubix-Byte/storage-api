import { Request, Response, NextFunction } from "express";
import multer from "multer";
import {
  sendErrorResponse,
  HttpStatusCodes,
} from "../utils/shared-lib-imports";

/**
 * Global error handling middleware
 * Catches and formats all errors in the application
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Global Error Handler:", error);

  // Handle Multer errors (file upload errors)
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || "52428800"); // 50MB default
      const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024));
      return sendErrorResponse(
        res,
        `File size exceeds maximum allowed size of ${maxFileSizeMB}MB (${maxFileSize} bytes)`,
        HttpStatusCodes.BAD_REQUEST,
        {}
      );
    }
    // Handle other Multer errors
    return sendErrorResponse(
      res,
      `File upload error: ${error.message}`,
      HttpStatusCodes.BAD_REQUEST,
      {}
    );
  }

  // Handle specific error types
  if (error.name === "ValidationError") {
    return sendErrorResponse(
      res,
      "Validation failed",
      HttpStatusCodes.BAD_REQUEST,
      { error: error.message }
    );
  }

  if (error.name === "CastError") {
    return sendErrorResponse(
      res,
      "Invalid ID format",
      HttpStatusCodes.BAD_REQUEST,
      { error: error.message }
    );
  }

  if (error.name === "MongoError" || error.name === "MongoServerError") {
    return sendErrorResponse(
      res,
      "Database error",
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
      { error: "Database operation failed" }
    );
  }

  if (error.message.includes("File size exceeds")) {
    // Format the error message to be more user-friendly
    const maxFileSizeMatch = error.message.match(/(\d+)\s*bytes/);
    if (maxFileSizeMatch) {
      const maxFileSizeBytes = parseInt(maxFileSizeMatch[1]);
      const maxFileSizeMB = Math.round(maxFileSizeBytes / (1024 * 1024));
      return sendErrorResponse(
        res,
        `File size exceeds maximum allowed size of ${maxFileSizeMB}MB (${maxFileSizeBytes} bytes)`,
        HttpStatusCodes.BAD_REQUEST,
        {}
      );
    }
    return sendErrorResponse(
      res,
      error.message,
      HttpStatusCodes.BAD_REQUEST,
      {}
    );
  }

  if (
    error.message.includes("File type") &&
    error.message.includes("not allowed")
  ) {
    return sendErrorResponse(
      res,
      error.message,
      HttpStatusCodes.BAD_REQUEST, // 415 Unsupported Media Type -> 400 Bad Request
      {}
    );
  }

  if (
    error.message.includes("not found") ||
    error.message.includes("access denied")
  ) {
    return sendErrorResponse(res, error.message, HttpStatusCodes.NOT_FOUND, {});
  }

  // Default error response
  return sendErrorResponse(
    res,
    "Internal server error",
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
    {
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    }
  );
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return sendErrorResponse(
    res,
    `Route ${req.method} ${req.path} not found`,
    HttpStatusCodes.NOT_FOUND,
    {}
  );
};
