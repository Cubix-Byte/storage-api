import mongoose, { Document, Schema } from 'mongoose';
import { IBaseDocument, BaseDocumentSchema } from '../utils/shared-lib-imports';

// User model interface - represents user account information (simplified for storage-api)
export interface IUser extends IBaseDocument {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  tenantName?: string;
  userType: 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent';
  userAccessType: 'private' | 'guest' | 'trial';
  isEmailVerified: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  refreshToken?: string;
}

const UserSchema: Schema = new Schema(
  {
    ...BaseDocumentSchema.obj,
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      lowercase: true,
      maxlength: [50, 'Username cannot exceed 50 characters']
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role is required']
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant'
    },
    tenantName: {
      type: String,
      trim: true
    },
    userType: {
      type: String,
      required: [true, 'User type is required'],
      enum: ['superadmin', 'admin', 'teacher', 'student', 'parent'],
      default: 'admin'
    },
    userAccessType: {
      type: String,
      required: [true, 'User access type is required'],
      enum: ['private', 'guest', 'trial'],
      default: 'private'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date
    },
    refreshToken: {
      type: String,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        const { _id, __v, refreshToken, ...rest } = ret;
        return { id: (_id as any).toString(), ...rest };
      }
    },
    toObject: {
      transform: function(doc, ret) {
        const { _id, __v, refreshToken, ...rest } = ret;
        return { id: (_id as any).toString(), ...rest };
      }
    }
  }
);

// Indexes for better performance
UserSchema.index({ username: 1, tenantId: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { userType: 'superadmin' }
});
UserSchema.index({ role: 1 });
UserSchema.index({ tenantId: 1 });
UserSchema.index({ userType: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ isDeleted: 1 });

// Virtual for checking if account is locked
UserSchema.virtual('isLocked').get(function(this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

export default mongoose.model<IUser>('User', UserSchema);
