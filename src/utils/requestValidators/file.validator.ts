import { z } from "zod";

/**
 * File upload validation schema
 */
export const uploadFileSchema = z.object({
  category: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  isPublic: z.union([z.string(), z.boolean()]).optional(),
  expiresAt: z.string().datetime().optional(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  isSyllabus: z.union([z.string(), z.boolean()]).optional()
});

/**
 * Get files query validation schema
 */
export const getFilesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  category: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional()
});

/**
 * File ID parameter validation schema
 */
export const fileIdParamSchema = z.object({
  fileId: z.string().min(1, "File ID is required")
});

/**
 * User ID parameter validation schema
 */
export const userIdParamSchema = z.object({
  userId: z.string().min(1, "User ID is required")
});

/**
 * Tenant ID parameter validation schema
 */
export const tenantIdParamSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required")
});

/**
 * Bulk delete validation schema
 */
export const bulkDeleteSchema = z.object({
  fileIds: z.array(z.string()).min(1, "At least one file ID is required")
});

/**
 * Presigned upload URL validation schema
 */
export const presignedUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  contentType: z.string().min(1, "Content type is required")
});

/**
 * File validation schema for internal APIs
 */
export const fileValidationSchema = z.object({
  fileId: z.string().optional(),
  s3Key: z.string().optional()
}).refine(data => data.fileId || data.s3Key, {
  message: "Either fileId or s3Key is required"
});

/**
 * Storage stats query validation schema
 */
export const storageStatsQuerySchema = z.object({
  tenantId: z.string().optional(),
  userId: z.string().optional()
});
