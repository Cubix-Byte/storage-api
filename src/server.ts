import dotenv from "dotenv";
dotenv.config();

// Global error handlers for uncaught exceptions and unhandled rejections
// uncaughtException handler (synchronous errors)
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

import createApp from "./app";
import { connectDatabase, initializeDatabase } from "./config/database";
// Import all models to ensure they are registered with Mongoose
import "./models";

let server: any;

// Main server startup function - connects to database and starts Express server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database with auto-sync
    await connectDatabase();
    
    // Initialize database to ensure it's ready
    await initializeDatabase();


    const app = createApp();
    const PORT = process.env.PORT || 3004;

    server = app.listen(PORT, () => {
      console.log(`🚀 Storage API running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔄 Database auto-sync: Collections will be created automatically when needed`);
      console.log(`📁 S3 Bucket: ${process.env.AWS_S3_BUCKET_NAME || 'cognify-dev-bucket-s3'}`);
      console.log(`🌍 S3 Region: ${process.env.AWS_REGION || 'ap-southeast-5'}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// unhandledRejection handler (asynchronous errors)
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log((err as Error).name, (err as Error).message);

  // gracefully shut down the server
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
