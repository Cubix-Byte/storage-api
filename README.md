# Storage API - File Storage Microservice

A comprehensive file storage microservice with AWS S3 integration, built following microservices architecture.

## 🚀 Features

- **File Upload & Download**: Secure file upload and download with presigned URLs
- **AWS S3 Integration**: Direct integration with Amazon S3 for scalable storage
- **Date-based Organization**: Automatic folder structure by date (YYYY/MM/DD/)
- **Bearer Token Authentication**: JWT-based authentication for all endpoints
- **Multi-tenant Support**: Tenant-based file organization and access control
- **File Metadata Management**: Comprehensive file tracking and metadata storage
- **File Validation**: Type and size validation with configurable limits
- **Storage Statistics**: Usage analytics and storage metrics
- **Bulk Operations**: Bulk file deletion and management

## 📁 Project Structure

```
storage-api/
├── src/
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # Server startup
│   ├── config/
│   │   ├── auth.config.ts        # JWT configuration
│   │   ├── global-auth.config.ts # Route access middleware
│   │   ├── route-access.config.ts # Route permissions
│   │   └── database.ts           # Database connection
│   ├── controllers/v1/           # Request handlers
│   │   └── file.controller.ts   # File operations
│   ├── services/                 # Business logic
│   │   ├── s3.service.ts         # AWS S3 operations
│   │   └── file-storage.service.ts # File management
│   ├── repositories/             # Data access layer
│   ├── models/                   # Domain schemas
│   │   ├── file-metadata.schema.ts
│   │   ├── user.schema.ts
│   │   ├── tenant.schema.ts
│   │   └── index.ts
│   ├── routes/                   # API endpoints
│   │   ├── file.routes.ts
│   │   └── index.ts
│   ├── types/                    # Request/Response interfaces
│   │   └── file.types.ts
│   ├── middlewares/              # Custom middleware
│   │   ├── error.middleware.ts
│   │   └── validate.middleware.ts
│   └── utils/
│       ├── constants/routes.ts   # Route definitions
│       ├── helpers/              # Service-specific helpers
│       ├── requestValidators/    # Zod validation schemas
│       └── shared-lib-imports.ts # Centralized imports
├── package.json
├── tsconfig.json
├── .npmrc                       # NPM registry configuration
├── .gitignore
├── env.example
├── postman_collection_v2.json
├── postman_environment.json
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js (v22 or v24)
- MongoDB
- AWS S3 Account
- Access to shared-lib package

### 1. Environment Setup

Copy the environment example file and configure your settings:

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=3004
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/storage-api-db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-storage-api
JWT_REFRESH_SECRET=your-super-secret-refresh-key-for-storage-api
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=your-region
AWS_S3_BUCKET_NAME=your-bucket-name

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004

# File Upload Configuration
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

# Storage Configuration
STORAGE_PROVIDER=s3
LOCAL_STORAGE_PATH=./uploads
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build and Run

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start

# Local development
npm run local
```

## 📚 API Documentation

### Base URL
```
http://localhost:3004
```

### Authentication
All endpoints (except health checks) require Bearer token authentication:

```
Authorization: Bearer <your-jwt-token>
```

### Public Endpoints

#### Health Check
```http
GET /health
GET /storage/api/v1/health
```

### File Management Endpoints

#### Upload File
```http
POST /storage/api/v1/files/upload
Content-Type: multipart/form-data

Body:
- file: (file) - The file to upload
- category: (string, optional) - File category
- tags: (string/array, optional) - File tags
- description: (string, optional) - File description
- isPublic: (boolean, optional) - Public access flag
- expiresAt: (string, optional) - Expiration date
```

#### Download File
```http
GET /storage/api/v1/files/download/{fileId}
```

#### Get File Metadata
```http
GET /storage/api/v1/files/{fileId}
```

#### Get Files by User
```http
GET /storage/api/v1/files/user/{userId}?page=1&limit=20&category=documents
```

#### Get Files by Tenant
```http
GET /storage/api/v1/files/tenant/{tenantId}?page=1&limit=20
```

#### Delete File
```http
DELETE /storage/api/v1/files/delete/{fileId}
```

#### Bulk Delete Files
```http
POST /storage/api/v1/files/bulk-delete
Content-Type: application/json

Body:
{
  "fileIds": ["fileId1", "fileId2"]
}
```

#### Generate Presigned Upload URL
```http
POST /storage/api/v1/files/presigned-upload
Content-Type: application/json

Body:
{
  "fileName": "document.pdf",
  "contentType": "application/pdf"
}
```

#### Get Storage Statistics
```http
GET /storage/api/v1/files/stats
```

## 🧪 Testing

### Postman Collection

Import the provided Postman collection and environment:

1. **Collection**: `postman_collection_v2.json`
2. **Environment**: `postman_environment.json`

### Test Flow

1. **Health Check**: Verify API is running
2. **Authentication**: Get JWT token from user-api
3. **File Upload**: Upload test files
4. **File Management**: Test CRUD operations

### Manual Testing

```bash
# Health check
curl http://localhost:3004/health

# Upload file (with authentication)
curl -X POST http://localhost:3004/storage/api/v1/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf" \
  -F "category=documents" \
  -F "description=Test file"
```

## 🔧 Configuration

### File Upload Limits

Configure in `.env`:

```env
MAX_FILE_SIZE=52428800  # 50MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

### S3 Configuration

Ensure your AWS credentials have the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### Date-based Folder Structure

Files are automatically organized by tenant and date:

```
bucket/
├── tenant_name_1/
│   ├── 2024-01-15/
│   │   ├── document_1234567890_abcdef.pdf
│   │   └── image_1234567891_ghijkl.jpg
│   └── 2024-01-16/
│       └── video_1234567892_mnopqr.mp4
├── tenant_name_2/
│   ├── 2024-01-15/
│   │   └── file_1234567893_stuvwx.docx
│   └── 2024-01-17/
│       └── presentation_1234567894_yzabcd.pptx
└── upload/
    ├── 2024-01-15/
    │   └── anonymous_file_1234567895_efghij.txt
    └── 2024-01-16/
        └── public_document_1234567896_klmnop.pdf
```

## 🔐 Security

### Authentication & Authorization

- **JWT Authentication**: All endpoints require valid JWT tokens
- **Route Access Control**: Configured via `route-access.config.ts`
- **File Access Control**: Users can only access their own files or public files

### File Security

- **File Type Validation**: Only allowed MIME types accepted
- **Size Limits**: Configurable file size restrictions
- **Checksum Validation**: MD5 checksums for file integrity
- **Presigned URLs**: Time-limited access URLs for downloads

## 📊 Monitoring & Analytics

### Storage Statistics

The API provides comprehensive storage analytics:

```json
{
  "totalFiles": 150,
  "totalSize": 52428800,
  "averageFileSize": 349525,
  "filesByCategory": {
    "documents": 75,
    "images": 50,
    "videos": 25
  },
  "filesByMimeType": {
    "application/pdf": 50,
    "image/jpeg": 30,
    "image/png": 20
  }
}
```

### Health Monitoring

- **Health Endpoints**: `/health` and `/storage/api/v1/health`
- **Database Status**: Automatic MongoDB connection monitoring
- **S3 Connectivity**: AWS S3 service health checks

## 🚀 Deployment

### Production Environment

1. **Environment Variables**: Set production values
2. **Database**: Use production MongoDB instance
3. **S3 Bucket**: Configure production S3 bucket
4. **Security**: Update JWT secrets
5. **Monitoring**: Enable logging and health checks

### Docker Deployment

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3004
CMD ["npm", "start"]
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3004
MONGODB_URI=mongodb://prod-db:27017/storage-api-prod
JWT_SECRET=your-production-jwt-secret
AWS_S3_BUCKET_NAME=your-production-bucket
```

## 🔄 Integration

### With Other Microservices

The storage-api integrates with other microservices through JWT authentication:

- **user-api**: User authentication and tenant management
- **academy-api**: Course materials and assignments
- **ai-api**: AI-generated content storage
- **analytics-api**: Storage usage analytics

### Client Integration

```javascript
// Upload file
const formData = new FormData();
formData.append('file', file);
formData.append('category', 'documents');

const response = await fetch('/storage/api/v1/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// Download file
const downloadResponse = await fetch(`/storage/api/v1/files/download/${fileId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const downloadUrl = await downloadResponse.json();
```

## 🐛 Troubleshooting

### Common Issues

1. **S3 Connection Errors**
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Ensure bucket exists and is accessible

2. **File Upload Failures**
   - Check file size limits
   - Verify file type restrictions
   - Ensure authentication token is valid

3. **Database Connection Issues**
   - Verify MongoDB is running
   - Check connection string
   - Ensure database permissions

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=storage-api:*
```

### Logs

The API provides comprehensive logging:

- **Request/Response**: HTTP request logging
- **File Operations**: Upload/download tracking
- **S3 Operations**: AWS S3 interaction logs
- **Database Operations**: MongoDB query logs
- **Error Tracking**: Detailed error information

## 📝 License

This project follows ISC licensing terms.

## 🤝 Contributing

1. Follow the microservices architecture patterns
2. Maintain compatibility with shared-lib
3. Add comprehensive tests for new features
4. Update documentation for API changes
5. Follow the established code style and patterns

---

**Storage API v1.0.0** - Built with ❤️