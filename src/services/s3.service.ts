import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";
import { IFileMetadata } from "../models/file-metadata.schema";


/**
 * AWS S3 Configuration and Service
 *
 * This service handles all S3 operations including upload, download, and deletion
 * with date-based folder structure for better organization.
 */
export class S3Service {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private region: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || "cognify-dev-bucket-s3";
    this.region = process.env.AWS_REGION || "ap-southeast-5";
  }

  /**
   * Get or initialize S3Client with proper credential handling
   * Supports both explicit credentials (for local dev) and IAM roles (for production/ECS)
   * The AWS SDK will automatically use IAM roles if credentials are not explicitly provided
   */
  private getS3Client(): S3Client {
    if (!this.s3Client) {
      const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || "").trim();
      const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || "").trim();

      const s3Config: any = {
        region: this.region,
        maxAttempts: 3,
      };

      if (accessKeyId && secretAccessKey) {
        console.log("🔐 Initializing S3Client with explicit credentials (local dev mode):", {
          accessKeyId: `${accessKeyId.substring(0, 4)}...`,
          secretAccessKey: "***",
          region: this.region,
          bucket: this.bucketName,
        });
        s3Config.credentials = {
          accessKeyId,
          secretAccessKey,
        };
      } else {
        console.log("🔐 Initializing S3Client with IAM role (production mode):", {
          credentialSource: "IAM Role (automatic)",
          region: this.region,
          bucket: this.bucketName,
        });
      }

      this.s3Client = new S3Client(s3Config);
    }

    return this.s3Client;
  }

  /**
   * Reset S3Client (useful for credential rotation or retry scenarios)
   */
  private resetS3Client(): void {
    this.s3Client = null;
  }

  /**
   * Generate date-based folder structure
   * Format: YYYY-MM-DD
   */
  private generateDateBasedPath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /**
   * Generate unique file key with tenant/date-based path
   * Format: tenantName/YYYY-MM-DD/filename OR upload/YYYY-MM-DD/filename
   */
  private generateFileKey(
    originalName: string,
    tenantName?: string,
    userId?: string
  ): string {
    const datePath = this.generateDateBasedPath();
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString("hex");
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);

    // Sanitize base name
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");

    // Create unique filename
    const uniqueFileName = `${sanitizedName}_${timestamp}_${randomString}${extension}`;

    // Create folder structure: tenantName/date/filename OR upload/date/filename
    let folderPath = "";
    if (tenantName) {
      // Sanitize tenant name
      const sanitizedTenantName = tenantName.replace(/[^a-zA-Z0-9-_]/g, "_");
      folderPath = `${sanitizedTenantName}/${datePath}/`;
    } else {
      folderPath = `upload/${datePath}/`;
    }

    return `${folderPath}${uniqueFileName}`;
  }

  /**
   * Upload file to S3 with retry logic for signature errors
   */
  async uploadFile(
    file: Express.Multer.File,
    metadata: Partial<IFileMetadata>,
    tenantName?: string,
    userId?: string
  ): Promise<{ s3Key: string; s3Url: string; checksum: string }> {
    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const s3Key = this.generateFileKey(
          file.originalname,
          tenantName,
          userId
        );

        // Calculate file checksum
        const checksum = crypto
          .createHash("md5")
          .update(file.buffer)
          .digest("hex");

        const uploadParams = {
          Bucket: this.bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
          Metadata: {
            originalName: file.originalname,
            uploadedBy: userId || "unknown",
            tenantName: tenantName || "unknown",
            uploadedAt: new Date().toISOString(),
            checksum: checksum,
          },
        };

        const command = new PutObjectCommand(uploadParams);
        const s3Client = this.getS3Client();
        await s3Client.send(command);

        const s3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;

        return {
          s3Key,
          s3Url,
          checksum,
        };
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        const errorName = error?.name || "";

        // Check if it's a signature error that might be resolved by reinitializing client
        if (
          (errorMessage.includes("SignatureDoesNotMatch") ||
            errorName === "SignatureDoesNotMatch") &&
          attempt < maxRetries
        ) {
          console.warn(
            `⚠️ S3 signature error on attempt ${attempt + 1}/${maxRetries + 1
            }. Retrying with fresh credentials...`
          );
          // Reset client to force reinitialization with fresh credentials
          this.resetS3Client();
          // Wait a bit before retry to avoid rate limiting
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1))
          );
          continue;
        }

        // For other errors or if we've exhausted retries, throw
        console.error("S3 Upload Error:", error);
        throw new Error(`Failed to upload file to S3: ${errorMessage}`);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error(
      `Failed to upload file to S3 after ${maxRetries + 1} attempts: ${lastError?.message || "Unknown error"
      }`
    );
  }

  /**
   * Generate presigned URL for file download
   */
  async generatePresignedDownloadUrl(
    s3Key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const s3Client = this.getS3Client();
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      console.error("S3 Presigned URL Error:", error);
      throw new Error(`Failed to generate presigned URL: ${error}`);
    }
  }

  /**
   * Generate presigned URL for file upload (for direct client uploads)
   */
  async generatePresignedUploadUrl(
    fileName: string,
    contentType: string,
    tenantName?: string,
    userId?: string,
    expiresIn: number = 3600
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    try {
      const s3Key = this.generateFileKey(fileName, tenantName, userId);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedBy: userId || "unknown",
          tenantName: tenantName || "unknown",
          uploadedAt: new Date().toISOString(),
        },
      });

      const s3Client = this.getS3Client();
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn,
      });

      return {
        presignedUrl,
        s3Key,
      };
    } catch (error) {
      console.error("S3 Presigned Upload URL Error:", error);
      throw new Error(`Failed to generate presigned upload URL: ${error}`);
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const s3Client = this.getS3Client();
      await s3Client.send(command);
    } catch (error) {
      console.error("S3 Delete Error:", error);
      throw new Error(`Failed to delete file from S3: ${error}`);
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const s3Client = this.getS3Client();
      await s3Client.send(command);
      return true;
    } catch (error) {
      if ((error as any).name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(s3Key: string): Promise<any> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const s3Client = this.getS3Client();
      const response = await s3Client.send(command);
      return {
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
        etag: response.ETag,
      };
    } catch (error) {
      console.error("S3 Get Metadata Error:", error);
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }

  /**
   * List files in a specific path (for cleanup operations)
   */
  async listFiles(prefix: string, maxKeys: number = 1000): Promise<string[]> {
    try {
      const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const s3Client = this.getS3Client();
      const response = await s3Client.send(command);
      return response.Contents?.map((obj) => obj.Key || "") || [];
    } catch (error) {
      console.error("S3 List Files Error:", error);
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  /**
   * Bulk delete files from S3
   */
  async bulkDeleteFiles(s3Keys: string[]): Promise<void> {
    try {
      const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");

      // S3 allows max 1000 objects per delete request
      const chunks = [];
      for (let i = 0; i < s3Keys.length; i += 1000) {
        chunks.push(s3Keys.slice(i, i + 1000));
      }

      const s3Client = this.getS3Client();
      for (const chunk of chunks) {
        const command = new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: chunk.map((key) => ({ Key: key })),
          },
        });

        await s3Client.send(command);
      }
    } catch (error) {
      console.error("S3 Bulk Delete Error:", error);
      throw new Error(`Failed to bulk delete files: ${error}`);
    }
  }

  /**
   * Get storage statistics for a tenant
   */
  async getStorageStats(tenantId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
  }> {
    try {
      const prefix =
        this.generateDateBasedPath().replace(/\d{4}\/\d{2}\/\d{2}\//, "") +
        `tenant_${tenantId}/`;
      const files = await this.listFiles(prefix, 10000);

      let totalSize = 0;
      let totalFiles = 0;

      for (const fileKey of files) {
        const metadata = await this.getFileMetadata(fileKey);
        totalSize += metadata.contentLength || 0;
        totalFiles++;
      }

      return {
        totalFiles,
        totalSize,
        averageFileSize: totalFiles > 0 ? totalSize / totalFiles : 0,
      };
    } catch (error) {
      console.error("S3 Storage Stats Error:", error);
      throw new Error(`Failed to get storage statistics: ${error}`);
    }
  }
}

// Export singleton instance
export const s3Service = new S3Service();
