/**
 * Route Constants for Storage API
 * 
 * This file defines all route paths used in the storage microservice.
 * Following the pattern: /service-name/api/v1/endpoint-name
 */

export const ROUTES = {
  // Service base path
  BASE: '/storage/api/v1',
  
  // Health check routes
  HEALTH: {
    BASE: '/health'
  },
  
  // File upload/download routes
  FILES: {
    BASE: '/files',
    SUBROUTES: {
      UPLOAD: '/upload',
      DOWNLOAD: '/download/:fileId',
      DELETE: '/delete/:fileId',
      LIST: '/list',
      GET_BY_ID: '/:fileId',
      GET_BY_USER: '/user/:userId',
      GET_BY_TENANT: '/tenant/:tenantId',
      BULK_DELETE: '/bulk-delete',
      BULK_UPLOAD: '/bulk-upload',
      GET_PRESIGNED_URL: '/presigned-url/:fileId'
    }
  },
  
  // Presigned upload route
  PRESIGNED_UPLOAD: '/presigned-upload'
} as const;
