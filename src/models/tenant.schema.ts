import mongoose, { Document, Schema } from 'mongoose';
import { IBaseDocument, BaseDocumentSchema } from '../utils/shared-lib-imports';

// Tenant model interface - represents tenant/organization information
export interface ITenant extends IBaseDocument {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  settings?: {
    maxFileSize?: number;
    allowedFileTypes?: string[];
    maxStorageQuota?: number;
    autoDeleteAfterDays?: number;
  };
  isActive: boolean;
  subscriptionStatus: 'active' | 'inactive' | 'suspended' | 'trial';
  subscriptionExpiresAt?: Date;
}

const TenantSchema: Schema = new Schema(
  {
    ...BaseDocumentSchema.obj,
    name: {
      type: String,
      required: [true, 'Tenant name is required'],
      trim: true,
      maxlength: [100, 'Tenant name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Tenant slug is required'],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: [50, 'Tenant slug cannot exceed 50 characters'],
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    logo: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
    },
    contactPhone: {
      type: String,
      trim: true,
      match: [/^[\+]?[0-9\-\s]{10,20}$/, 'Please enter a valid phone number']
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, 'Street address cannot exceed 200 characters']
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, 'City cannot exceed 100 characters']
      },
      state: {
        type: String,
        trim: true,
        maxlength: [100, 'State cannot exceed 100 characters']
      },
      country: {
        type: String,
        trim: true,
        maxlength: [100, 'Country cannot exceed 100 characters']
      },
      zipCode: {
        type: String,
        trim: true,
        maxlength: [20, 'ZIP code cannot exceed 20 characters']
      }
    },
    settings: {
      maxFileSize: {
        type: Number,
        default: 52428800, // 50MB default
        min: [1024, 'Max file size must be at least 1KB']
      },
      allowedFileTypes: [{
        type: String,
        trim: true
      }],
      maxStorageQuota: {
        type: Number,
        default: 1073741824, // 1GB default
        min: [1048576, 'Max storage quota must be at least 1MB']
      },
      autoDeleteAfterDays: {
        type: Number,
        default: 365, // 1 year default
        min: [1, 'Auto delete must be at least 1 day']
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    subscriptionStatus: {
      type: String,
      required: [true, 'Subscription status is required'],
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'trial'
    },
    subscriptionExpiresAt: {
      type: Date
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
TenantSchema.index({ slug: 1 }, { unique: true });
TenantSchema.index({ name: 1 });
TenantSchema.index({ isActive: 1 });
TenantSchema.index({ isDeleted: 1 });
TenantSchema.index({ subscriptionStatus: 1 });
TenantSchema.index({ subscriptionExpiresAt: 1 });

// Virtual for checking if subscription is active
TenantSchema.virtual('isSubscriptionActive').get(function(this: ITenant) {
  if (this.subscriptionStatus === 'active') {
    return true;
  }
  if (this.subscriptionStatus === 'trial' && this.subscriptionExpiresAt) {
    return this.subscriptionExpiresAt > new Date();
  }
  return false;
});

// Virtual for storage quota usage (would need to be calculated from file metadata)
TenantSchema.virtual('storageUsed').get(function(this: ITenant) {
  // This would be calculated by aggregating file sizes for this tenant
  return 0;
});

export default mongoose.model<ITenant>('Tenant', TenantSchema);
