import { createRouteAccessMiddleware, sendErrorResponse } from '../utils/shared-lib-imports';
import { jwtHelper } from './auth.config';
import { routeAccessConfig } from './route-access.config';
import { ROUTES } from '../utils/constants/routes';
import User from '../models/user.schema';

/**
 * Global Route Access Middleware Configuration
 * 
 * This middleware automatically handles authentication and authorization
 * for all routes based on the routeAccessConfig.
 * 
 * No need to add authenticateJWT or authorizeRoles to individual routes!
 */
export const globalAuthMiddleware = createRouteAccessMiddleware({
  routeAccessMap: routeAccessConfig,
  jwtHelper,
  internalApiKey: process.env.INTERNAL_API_KEY || 'your-internal-api-key-here',
  sendErrorResponse,
  
  // Optional: Fetch full user details (for additional validation)
  getUserById: async (userId: string) => {
    return await User.findById(userId)
      .populate('role')
      .select('+refreshToken');
  },
  
  // Optional: Extract role from user object
  extractUserRole: (user: any) => {
    return user?.role?.name || user?.roleName;
  },
  
  // Default access level for routes not in config (PRIVATE = requires auth)
  defaultAccess: undefined // Will use PRIVATE as default from middleware
});

// Debug middleware to log incoming requests
export const debugMiddleware = (req: any, res: any, next: any) => {
  if (req.path.includes('upload') || req.path.includes('download')) {
    console.log('=== STORAGE DEBUG MIDDLEWARE ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Route key:', `${req.method.toUpperCase()} ${req.path}`);
    console.log('Route config exists:', !!routeAccessConfig[`${req.method.toUpperCase()} ${req.path}`]);
    console.log('Route config:', routeAccessConfig[`${req.method.toUpperCase()} ${req.path}`]);
    console.log('================================');
  }
  next();
};
