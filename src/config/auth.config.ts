import {
  JWTHelper,
  createAuthMiddleware,
  sendErrorResponse,
} from "../utils/shared-lib-imports";
import User from "../models/user.schema";

// Initialize JWT Helper with environment configuration
export const jwtHelper = new JWTHelper({
  jwtSecret: process.env.JWT_SECRET || "your-super-secret-jwt-key",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || "your-super-secret-refresh-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "2h",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  issuer: process.env.JWT_ISSUER || "user-api",
  audience: process.env.JWT_AUDIENCE || "user-api-users",
});

// Create authentication middleware with storage-api specific logic
export const authenticateJWT = createAuthMiddleware({
  jwtHelper,

  // Function to fetch user from database
  getUserById: async (userId: string) => {
    return await User.findById(userId)
      .populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      })
      .select("+refreshToken");
  },

  // Error response handler
  sendErrorResponse,

  // Check if user is active
  checkUserActive: (user: any) => {
    return user && user.isActive && !user.isDeleted;
  },

  // Check if user is locked
  checkUserLocked: (user: any) => {
    return user.isLocked === true;
  },

  // Extract permissions from user
  extractPermissions: (user: any) => {
    const role = user.role as any;
    if (role && role.permissions) {
      return role.permissions.map((permission: any) => permission.name);
    }
    return [];
  },

  // Extract additional user data
  extractUserData: (user: any, decoded: any) => {
    return {
      tenantId: user.tenantId?.toString(),
      tenantName: user.tenantName,
    };
  },
});
