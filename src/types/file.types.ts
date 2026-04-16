/**
 * File-related type definitions for Storage API
 */

export interface UploadFileRequest {
  category?: string;
  tags?: string | string[];
  description?: string;
  isPublic?: boolean | string;
  expiresAt?: string;
  subject?: string;
  grade?: string;
  isSyllabus?: boolean | string;
}

export interface GetFilesRequest {
  page?: string;
  limit?: string;
  category?: string;
  tags?: string | string[];
}

export interface BulkDeleteRequest {
  fileIds: string[];
}

export interface BulkUploadRequest {
  // Per-file metadata as JSON array (each object corresponds to file by index)
  metadata?: string | FileMetadataItem[];
  // Fallback: if metadata array not provided, these apply to all files
  category?: string;
  tags?: string | string[];
  description?: string;
  isPublic?: boolean | string;
  expiresAt?: string;
  subject?: string;
  grade?: string;
  isSyllabus?: boolean | string;
}

export interface FileMetadataItem {
  category?: string;
  tags?: string | string[];
  description?: string;
  isPublic?: boolean | string;
  expiresAt?: string;
  subject?: string;
  grade?: string;
  isSyllabus?: boolean | string;
}

export interface PresignedUploadRequest {
  fileName: string;
  contentType: string;
}

export interface FileValidationRequest {
  fileId?: string;
  s3Key?: string;
}

export interface StorageStatsQuery {
  tenantId?: string;
  userId?: string;
}

export interface FileUploadResponse {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  s3Key: string;
  s3Url: string;
  uploadedBy: string;
  tenantId?: string;
  tenantName?: string;
  category?: string;
  tags?: string[];
  description?: string;
  isPublic: boolean;
  downloadCount: number;
  checksum?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
}

export interface FileListResponse {
  files: FileUploadResponse[];
  total: number;
  page: number;
  totalPages: number;
}

export interface StorageStatsResponse {
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  filesByCategory: Record<string, number>;
  filesByMimeType: Record<string, number>;
}

export interface PresignedUploadResponse {
  presignedUrl: string;
  s3Key: string;
}

export interface BulkDeleteResponse {
  deletedCount: number;
}

export interface FileMetadataResponse {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileSizeFormatted: string;
  mimeType: string;
  fileExtension: string;
  s3Key: string;
  s3Url: string;
  uploadedBy: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  tenantId?: {
    id: string;
    name: string;
    slug: string;
  };
  tenantName?: string;
  category?: string;
  tags?: string[];
  description?: string;
  isPublic: boolean;
  downloadCount: number;
  lastAccessed?: string;
  expiresAt?: string;
  isExpired: boolean;
  checksum?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
