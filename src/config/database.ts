import mongoose from 'mongoose';

// Database connection function - connects to MongoDB using environment variables
export const connectDatabase = async (): Promise<void> => {
  try {
    // Get database name from environment variable
    const dbName = process.env.DB_NAME || 'storage-api';
    const mongoHost = process.env.MONGODB_HOST || 'localhost:27017';
    const mongoUri = process.env.MONGODB_URI || `mongodb://${mongoHost}/${dbName}`;
    
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 Database URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
    console.log(`🗄️  Database Name: ${dbName}`);
    
    // Configure mongoose for auto-sync
    mongoose.set('strictQuery', false);
    
    // Connection options for automatic database creation
    const connectionOptions = {
      // Auto-create collections and sync schema changes
      autoIndex: true,
      autoCreate: true,
      // Connection timeout settings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Retry settings
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      // Auto-reconnect
      retryWrites: true,
      retryReads: true,
    };
    
    await mongoose.connect(mongoUri, connectionOptions);
    
    console.log('✅ MongoDB connected successfully');
    console.log('🔄 Auto-sync enabled - database changes will be detected automatically');
    console.log('🗄️  Database will be created automatically if it does not exist');
    
    // Log current collections
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📋 Database contains ${collections.length} collections`);
      
      // List collection names
      if (collections.length > 0) {
        const collectionNames = collections.map(col => col.name).join(', ');
        console.log(`📝 Collections: ${collectionNames}`);
      } else {
        console.log('📝 No collections found - they will be created automatically when needed');
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('💡 Make sure MongoDB is running on your system');
    console.error('💡 Check your MONGODB_URI in .env file');
    process.exit(1);
  }
};

// Database initialization function - ensures database is ready
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing database...');
    
    // Ensure database exists by creating a test collection
    if (mongoose.connection.db) {
      // Create a test collection to ensure database exists
      const testCollection = mongoose.connection.db.collection('_test');
      await testCollection.insertOne({ test: true, timestamp: new Date() });
      await testCollection.deleteOne({ test: true });
      
      console.log('✅ Database initialized successfully');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Database disconnection function - gracefully closes MongoDB connection
export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
