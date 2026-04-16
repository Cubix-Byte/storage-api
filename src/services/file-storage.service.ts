import { FileMetadata, IFileMetadata } from "../models";
import { s3Service } from "./s3.service";
import mongoose from "mongoose";
import axios, { AxiosResponse } from "axios";

/**
 * File Storage Service
 *
 * This service handles file operations including upload, download, deletion,
 * and metadata management with S3 integration.
 */
export class FileStorageService {
  /**
   * Upload file and save metadata
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadedBy: string,
    tenantId?: string,
    tenantName?: string,
    category?: string,
    tags?: string[],
    description?: string,
    isPublic: boolean = false,
    expiresAt?: Date,
    subject?: string,
    grade?: string,
    isSyllabus?: boolean
  ): Promise<IFileMetadata> {
    try {
      // Validate file
      await this.validateFile(file, isSyllabus);

      // Upload to S3
      const uploadResult = await s3Service.uploadFile(
        file,
        {},
        tenantName,
        uploadedBy
      );

      // Normalize subject and grade: convert empty strings to null
      const normalizedSubject =
        subject && subject.trim() !== "" ? subject.trim() : null;
      const normalizedGrade =
        grade && grade.trim() !== "" ? grade.trim() : null;


      // Create file metadata
      const fileMetadata = new FileMetadata({
        fileName: file.originalname,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileExtension: this.getFileExtension(file.originalname),
        s3Key: uploadResult.s3Key,
        s3Bucket: process.env.AWS_S3_BUCKET_NAME || "cognify-dev-bucket-s3",
        s3Region: process.env.AWS_REGION || "ap-southeast-5",
        s3Url: uploadResult.s3Url,
        uploadedBy: mongoose.Types.ObjectId.isValid(uploadedBy)
          ? new mongoose.Types.ObjectId(uploadedBy)
          : new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        tenantId:
          tenantId && mongoose.Types.ObjectId.isValid(tenantId)
            ? new mongoose.Types.ObjectId(tenantId)
            : undefined,
        tenantName,
        category,
        tags,
        description,
        isPublic,
        expiresAt,
        checksum: uploadResult.checksum,
        subject: normalizedSubject,
        grade: normalizedGrade,
        createdBy: uploadedBy, // Required by BaseDocumentSchema
        metadata: {
          uploadedAt: new Date().toISOString(),
          userAgent: "storage-api",
        },
      });

      return await fileMetadata.save();
    } catch (error) {
      console.error("File upload error:", error);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(
    fileId: string,
    userId?: string,
    tenantId?: string
  ): Promise<IFileMetadata | null> {
    try {
      const query: any = {
        _id: mongoose.Types.ObjectId.isValid(fileId)
          ? new mongoose.Types.ObjectId(fileId)
          : fileId,
        isActive: true,
        isDeleted: false,
      };

      // Add access control
      if (userId) {
        query.$or = [
          {
            uploadedBy: mongoose.Types.ObjectId.isValid(userId)
              ? new mongoose.Types.ObjectId(userId)
              : userId,
          },
          { isPublic: true },
        ];
      }

      if (tenantId) {
        query.tenantId = mongoose.Types.ObjectId.isValid(tenantId)
          ? new mongoose.Types.ObjectId(tenantId)
          : tenantId;
      }

      const file = await FileMetadata.findOne(query)
        .populate("uploadedBy", "username firstName lastName email")
        .populate("tenantId", "name slug");

      if (file) {
        // Update last accessed time
        await (file as any).updateLastAccessed();
      }

      return file;
    } catch (error) {
      console.error("Get file by ID error:", error);
      throw error;
    }
  }

  /**
   * Get files by user
   */
  async getFilesByUser(
    userId: string,
    tenantId?: string,
    page: number = 1,
    limit: number = 20,
    category?: string,
    tags?: string[]
  ): Promise<{
    files: IFileMetadata[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {
        uploadedBy: mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId,
        isActive: true,
        isDeleted: false,
      };

      if (tenantId) {
        query.tenantId = mongoose.Types.ObjectId.isValid(tenantId)
          ? new mongoose.Types.ObjectId(tenantId)
          : tenantId;
      }

      if (category) {
        query.category = category;
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      const skip = (page - 1) * limit;

      const [files, total] = await Promise.all([
        FileMetadata.find(query)
          .populate("uploadedBy", "username firstName lastName email")
          .populate("tenantId", "name slug")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        FileMetadata.countDocuments(query),
      ]);

      return {
        files,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("Get files by user error:", error);
      throw error;
    }
  }

  /**
   * Get files by tenant
   */
  async getFilesByTenant(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    category?: string,
    tags?: string[]
  ): Promise<{
    files: IFileMetadata[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        isActive: true,
        isDeleted: false,
      };

      if (category) {
        query.category = category;
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      const skip = (page - 1) * limit;

      const [files, total] = await Promise.all([
        FileMetadata.find(query)
          .populate("uploadedBy", "username firstName lastName email")
          .populate("tenantId", "name slug")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        FileMetadata.countDocuments(query),
      ]);

      return {
        files,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("Get files by tenant error:", error);
      throw error;
    }
  }

  /**
   * Generate presigned download URL for public files (no auth required)
   */
  async generatePublicDownloadUrl(fileId: string): Promise<string> {
    try {
      console.error("🔗 [STORAGE API] generatePublicDownloadUrl called:", {
        fileId,
      });

      const file = await FileMetadata.findOne({
        _id: mongoose.Types.ObjectId.isValid(fileId)
          ? new mongoose.Types.ObjectId(fileId)
          : fileId,
        isActive: true,
        isDeleted: false,
        isPublic: true, // Only public files
      });

      if (!file) {
        console.error("❌ [STORAGE API] Public file not found:", { fileId });
        throw new Error("Public file not found");
      }

      console.error("✅ [STORAGE API] File found:", {
        fileId,
        fileName: file.fileName,
        isPublic: file.isPublic,
        s3Key: file.s3Key,
      });

      // Check if file exists in S3
      const exists = await s3Service.fileExists(file.s3Key);
      if (!exists) {
        console.error("❌ [STORAGE API] File not found in S3:", {
          s3Key: file.s3Key,
        });
        throw new Error("File not found in storage");
      }

      console.error(
        "✅ [STORAGE API] File exists in S3, generating presigned URL..."
      );

      // Generate presigned URL (valid for 1 hour)
      const presignedUrl = await s3Service.generatePresignedDownloadUrl(
        file.s3Key,
        3600
      );

      console.error("✅ [STORAGE API] Presigned URL generated:", {
        urlLength: presignedUrl.length,
        urlPreview: presignedUrl.substring(0, 150),
        isS3Url:
          presignedUrl.includes("amazonaws.com") ||
          presignedUrl.includes("s3."),
        protocol: presignedUrl.split("://")[0],
        domain: presignedUrl.split("/")[2],
      });

      // Increment download count
      await (file as any).incrementDownloadCount();

      return presignedUrl;
    } catch (error) {
      console.error(
        "❌ [STORAGE API] Generate public download URL error:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate presigned download URL
   */
  async generateDownloadUrl(
    fileId: string,
    userId?: string,
    tenantId?: string
  ): Promise<string> {
    try {
      const file = await this.getFileById(fileId, userId, tenantId);

      if (!file) {
        throw new Error("File not found or access denied");
      }

      // Check if file exists in S3
      const exists = await s3Service.fileExists(file.s3Key);
      if (!exists) {
        throw new Error("File not found in storage");
      }

      // Generate presigned URL (valid for 1 hour)
      const presignedUrl = await s3Service.generatePresignedDownloadUrl(
        file.s3Key,
        3600
      );

      // Increment download count
      await (file as any).incrementDownloadCount();

      return presignedUrl;
    } catch (error) {
      console.error("Generate download URL error:", error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(
    fileId: string,
    userId?: string,
    tenantId?: string
  ): Promise<void> {
    try {
      const file = await this.getFileById(fileId, userId, tenantId);

      if (!file) {
        throw new Error("File not found or access denied");
      }

      // Delete from S3
      await s3Service.deleteFile(file.s3Key);

      // Soft delete from database
      await FileMetadata.findByIdAndUpdate(file._id, {
        isDeleted: true,
        deletedAt: new Date(),
      });
    } catch (error) {
      console.error("Delete file error:", error);
      throw error;
    }
  }

  /**
   * Bulk upload files with per-file metadata
   */
  async bulkUploadFiles(
    files: Express.Multer.File[],
    uploadedBy: string,
    tenantId?: string,
    tenantName?: string,
    filesMetadata?: Array<{
      category?: string;
      tags?: string[];
      description?: string;
      isPublic?: boolean;
      expiresAt?: Date;
      subject?: string;
      grade?: string;
      isSyllabus?: boolean;
    }>
  ): Promise<IFileMetadata[]> {
    try {
      if (!files || files.length === 0) {
        throw new Error("No files provided");
      }

      const uploadedFiles: IFileMetadata[] = [];

      // Upload files sequentially to avoid overwhelming the system
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileMetadata = filesMetadata?.[i] || {};

        try {
          const uploadedFile = await this.uploadFile(
            file,
            uploadedBy,
            tenantId,
            tenantName,
            fileMetadata.category,
            fileMetadata.tags,
            fileMetadata.description,
            fileMetadata.isPublic ?? false,
            fileMetadata.expiresAt,
            fileMetadata.subject,
            fileMetadata.grade,
            fileMetadata.isSyllabus
          );
          uploadedFiles.push(uploadedFile);
        } catch (error: any) {
          console.error(`Failed to upload file ${file.originalname}:`, error);
          // Continue with other files even if one fails
          // You might want to track failures and return them
        }
      }

      if (uploadedFiles.length === 0) {
        throw new Error("Failed to upload any files");
      }

      return uploadedFiles;
    } catch (error) {
      console.error("Bulk upload files error:", error);
      throw error;
    }
  }

  /**
   * Bulk delete files
   */
  async bulkDeleteFiles(
    fileIds: string[],
    userId?: string,
    tenantId?: string
  ): Promise<void> {
    try {
      const query: any = {
        _id: { $in: fileIds.map((id) => new mongoose.Types.ObjectId(id)) },
        isActive: true,
        isDeleted: false,
      };

      if (userId) {
        query.uploadedBy = new mongoose.Types.ObjectId(userId);
      }

      if (tenantId) {
        query.tenantId = new mongoose.Types.ObjectId(tenantId);
      }

      const files = await FileMetadata.find(query);

      if (files.length === 0) {
        throw new Error("No files found or access denied");
      }

      // Delete from S3
      const s3Keys = files.map((file: any) => file.s3Key);
      await s3Service.bulkDeleteFiles(s3Keys);

      // Soft delete from database
      await FileMetadata.updateMany(
        { _id: { $in: files.map((f: any) => f._id) } },
        {
          isDeleted: true,
          deletedAt: new Date(),
        }
      );
    } catch (error) {
      console.error("Bulk delete files error:", error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(
    tenantId?: string,
    userId?: string
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    filesByCategory: Record<string, number>;
    filesByMimeType: Record<string, number>;
  }> {
    try {
      const query: any = {
        isActive: true,
        isDeleted: false,
      };

      if (tenantId) {
        query.tenantId = new mongoose.Types.ObjectId(tenantId);
      }

      if (userId) {
        query.uploadedBy = new mongoose.Types.ObjectId(userId);
      }

      const files = await FileMetadata.find(query);

      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce(
          (sum: number, file: any) => sum + file.fileSize,
          0
        ),
        averageFileSize: 0,
        filesByCategory: {} as Record<string, number>,
        filesByMimeType: {} as Record<string, number>,
      };

      if (stats.totalFiles > 0) {
        stats.averageFileSize = stats.totalSize / stats.totalFiles;
      }

      // Count by category
      files.forEach((file: any) => {
        const category = file.category || "uncategorized";
        stats.filesByCategory[category] =
          (stats.filesByCategory[category] || 0) + 1;
      });

      // Count by MIME type
      files.forEach((file: any) => {
        const mimeType = file.mimeType;
        stats.filesByMimeType[mimeType] =
          (stats.filesByMimeType[mimeType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("Get storage stats error:", error);
      throw error;
    }
  }

  /**
   * Cleanup orphaned files (files in S3 but not in database)
   */
  async cleanupOrphanedFiles(): Promise<{
    deletedCount: number;
    deletedSize: number;
  }> {
    try {
      // This is a complex operation that would need to be implemented
      // based on specific requirements. For now, return empty result.
      return {
        deletedCount: 0,
        deletedSize: 0,
      };
    } catch (error) {
      console.error("Cleanup orphaned files error:", error);
      throw error;
    }
  }

  async downloadFileFromUrl(fileUrl: string): Promise<AxiosResponse> {
    try {
      if (!fileUrl) {
        throw new Error("File URL is required.");
      }

      return await axios({
        url: fileUrl,
        method: "GET",
        responseType: "stream",
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  private async validateFile(
    file: Express.Multer.File,
    isSyllabus?: boolean
  ): Promise<void> {
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || "52428800"); // 50MB default

    // If isSyllabus is true, only allow PDF files
    let allowedTypes: string[];
    if (isSyllabus === true) {
      allowedTypes = ["application/pdf"];
    } else {
      allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(",") || [
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
    }

    if (file.size > maxFileSize) {
      const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024));
      throw new Error(
        `File size exceeds maximum allowed size of ${maxFileSizeMB}MB (${maxFileSize} bytes)`
      );
    }

    if (!allowedTypes.includes(file.mimetype)) {
      if (isSyllabus === true) {
        throw new Error(
          `Only PDF files are allowed in syllabus folders. File type ${file.mimetype} is not allowed.`
        );
      }
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : "";
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();
