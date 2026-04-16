import {
  RouteAccessLevel,
  RouteAccessMap,
  routeKey,
} from "../utils/shared-lib-imports";
import { ROUTES } from "../utils/constants/routes";
import { ROLE_NAMES } from "../utils/shared-lib-imports";

/**
 * Route Access Configuration for Storage API
 *
 * This configuration defines access levels for all routes in the application.
 * The global route access middleware will automatically handle authentication
 * based on these settings.
 *
 * Access Levels:
 * - PUBLIC: No authentication required
 * - PRIVATE: Authentication required (any logged-in user)
 * - ADMIN: Admin role required
 * - ROLE_BASED: Specific role(s) required (defined in roles array)
 * - INTERNAL: Internal microservice API key required
 */
export const routeAccessConfig: RouteAccessMap = {
  // ============================================
  // HEALTH CHECK ROUTES (PUBLIC)
  // ============================================
  [routeKey("GET", "/health")]: {
    level: RouteAccessLevel.PUBLIC,
    active: true,
  },

  [routeKey("GET", `${ROUTES.BASE}${ROUTES.HEALTH.BASE}`)]: {
    level: RouteAccessLevel.PUBLIC,
    active: true,
  },

  // ============================================
  // FILE UPLOAD ROUTES (PRIVATE - Any authenticated user)
  // ============================================
  [routeKey(
    "POST",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}${ROUTES.FILES.SUBROUTES.UPLOAD}`
  )]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  // ============================================
  // FILE DOWNLOAD ROUTES (PRIVATE - Any authenticated user)
  // ============================================
  [routeKey(
    "GET",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}${ROUTES.FILES.SUBROUTES.DOWNLOAD}`
  )]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  [routeKey(
    "GET",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}${ROUTES.FILES.SUBROUTES.GET_PRESIGNED_URL}`
  )]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  // Public download route for public files (no auth required)
  // Full path: /storage/api/v1/files/download/public/:fileId
  [routeKey(
    "GET",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}/download/public/:fileId`
  )]: {
    level: RouteAccessLevel.PUBLIC,
    active: true,
  },

  // Short public download route alias (no auth required)
  // Full path: /storage/api/v1/files/d/:fileId
  [routeKey("GET", `${ROUTES.BASE}${ROUTES.FILES.BASE}/d/:fileId`)]: {
    level: RouteAccessLevel.PUBLIC,
    active: true,
  },

  // Catch incorrect URL pattern: /files/:fileId/download -> treat as public download
  // Full path: /storage/api/v1/files/:fileId/download
  [routeKey("GET", `${ROUTES.BASE}${ROUTES.FILES.BASE}/:fileId/download`)]: {
    level: RouteAccessLevel.PUBLIC,
    active: true,
  },

  // ============================================
  // FILE MANAGEMENT ROUTES (PRIVATE - Any authenticated user)
  // ============================================
  [routeKey(
    "GET",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}${ROUTES.FILES.SUBROUTES.LIST}`
  )]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  [routeKey(
    "GET",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}${ROUTES.FILES.SUBROUTES.GET_BY_ID}`
  )]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  [routeKey(
    "GET",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}${ROUTES.FILES.SUBROUTES.GET_BY_USER}`
  )]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  [routeKey(
    "GET",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}${ROUTES.FILES.SUBROUTES.GET_BY_TENANT}`
  )]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  [routeKey(
    "DELETE",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}${ROUTES.FILES.SUBROUTES.DELETE}`
  )]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  [routeKey(
    "POST",
    `${ROUTES.BASE}${ROUTES.FILES.BASE}${ROUTES.FILES.SUBROUTES.BULK_DELETE}`
  )]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  // ============================================
  // STORAGE STATISTICS ROUTES (PRIVATE - Any authenticated user)
  // ============================================
  [routeKey("GET", `${ROUTES.BASE}${ROUTES.FILES.BASE}/stats`)]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },

  [routeKey("POST", `${ROUTES.BASE}${ROUTES.FILES.BASE}/presigned-upload`)]: {
    level: RouteAccessLevel.PRIVATE,
    active: true,
  },
};
