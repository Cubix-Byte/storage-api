// Centralized shared-lib imports for version management
// Update the version here when shared-lib is updated

// Re-export all shared-lib constants and utilities
export {
  // Response utilities
  sendSuccessResponse,
  sendErrorResponse,

  // HTTP status codes
  HttpStatusCodes,

  // Response messages
  ResponseMessages,

  // User enums and constants
  USER_TYPES,
  USER_TYPE_ARRAY,
  USER_ACCESS_TYPES,
  USER_ACCESS_TYPE_ARRAY,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_ARRAY,
  PROFILE_STATUS,
  PROFILE_STATUS_ARRAY,
  ROLE_NAMES,
  ROLE_DISPLAY_NAMES,
  canManageTenants,

  // Permission enums and constants
  PERMISSION_RESOURCES,
  PERMISSION_RESOURCE_ARRAY,
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_ARRAY,
  PERMISSIONS,

  // Security constants
  PASSWORD_CONFIG,

  // Models
  IBaseDocument,
  BaseDocumentSchema,

  // JWT & Auth
  JWTHelper,
  JWTPayload,
  TokenPair,
  createAuthMiddleware,
  createSimpleAuthMiddleware,

  // Route Access
  RouteAccessLevel,
  RouteAccessMap,
  RouteAccessConfig,
  createRouteAccessMiddleware,
  routeKey,

  // Other utilities
  getCurrentISO8601DateTime,
  getTimeStamp,
  getRemainingDuration,
  getOtpExpiryTime,
} from "shared-lib";

// Version constant for easy tracking
export const SHARED_LIB_VERSION = "1.0.27";
