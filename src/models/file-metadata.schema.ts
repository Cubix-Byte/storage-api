import mongoose, { Document, Schema } from 'mongoose';
import { IBaseDocument, BaseDocumentSchema } from '../utils/shared-lib-imports';

// File metadata interface - represents file information stored in database
export interface IFileMetadata extends IBaseDocument {
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  s3Key: string;
  s3Bucket: string;
  s3Region: string;
  s3Url: string;
  uploadedBy: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  tenantName?: string;
  category?: string;
  tags?: string[];
  description?: string;
  isPublic: boolean;
  downloadCount: number;
  lastAccessed?: Date;
  expiresAt?: Date;
  checksum?: string;
  isEmbedded?: boolean;
  metadata?: Record<string, any>;
  subject?: string;
  grade?: string;
}

const FileMetadataSchema: Schema = new Schema(
  {
    ...BaseDocumentSchema.obj,
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters']
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'Original file name cannot exceed 255 characters']
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative']
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true
    },
    fileExtension: {
      type: String,
      required: [true, 'File extension is required'],
      trim: true,
      lowercase: true
    },
    s3Key: {
      type: String,
      required: [true, 'S3 key is required'],
      trim: true,
      unique: true
    },
    s3Bucket: {
      type: String,
      required: [true, 'S3 bucket is required'],
      trim: true
    },
    s3Region: {
      type: String,
      required: [true, 'S3 region is required'],
      trim: true
    },
    s3Url: {
      type: String,
      required: [true, 'S3 URL is required'],
      trim: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader user ID is required']
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant'
    },
    tenantName: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters']
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: [0, 'Download count cannot be negative']
    },
    lastAccessed: {
      type: Date
    },
    expiresAt: {
      type: Date
    },
    checksum: {
      type: String,
      trim: true
    },
    isEmbedded: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    subject: {
      type: String,
      trim: true,
      default: null
    },
    grade: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: (_id as any).toString(), ...rest };
      }
    },
    toObject: {
      transform: function(doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: (_id as any).toString(), ...rest };
      }
    }
  }
);

// Indexes for better performance
FileMetadataSchema.index({ uploadedBy: 1 });
FileMetadataSchema.index({ tenantId: 1 });
FileMetadataSchema.index({ s3Key: 1 }, { unique: true });
FileMetadataSchema.index({ fileName: 1 });
FileMetadataSchema.index({ mimeType: 1 });
FileMetadataSchema.index({ category: 1 });
FileMetadataSchema.index({ tags: 1 });
FileMetadataSchema.index({ isPublic: 1 });
FileMetadataSchema.index({ isActive: 1 });
FileMetadataSchema.index({ isDeleted: 1 });
FileMetadataSchema.index({ createdAt: -1 });
FileMetadataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes
FileMetadataSchema.index({ uploadedBy: 1, tenantId: 1 });
FileMetadataSchema.index({ tenantId: 1, category: 1 });
FileMetadataSchema.index({ uploadedBy: 1, createdAt: -1 });

// Virtual for file size in human readable format
FileMetadataSchema.virtual('fileSizeFormatted').get(function(this: IFileMetadata) {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for checking if file is expired
FileMetadataSchema.virtual('isExpired').get(function(this: IFileMetadata) {
  return this.expiresAt ? this.expiresAt < new Date() : false;
});

// Instance method to increment download count
FileMetadataSchema.methods.incrementDownloadCount = function() {
  return this.updateOne({
    $inc: { downloadCount: 1 },
    $set: { lastAccessed: new Date() }
  });
};

// Instance method to update last accessed time
FileMetadataSchema.methods.updateLastAccessed = function() {
  return this.updateOne({
    $set: { lastAccessed: new Date() }
  });
};

export default mongoose.model<IFileMetadata>('FileMetadata', FileMetadataSchema);
