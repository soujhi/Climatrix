import mongoose from 'mongoose';

/**
 * DATABASE CONNECTION UTILITY (M - MongoDB / Mongoose)
 * Establishes connection to MongoDB database using Mongoose ODM.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/climatrix', {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    // Non-fatal warning log for demo environment if DB isn't running locally yet
    console.warn(`[Database Notice] Ensure your local MongoDB server is running or provide MONGODB_URI in server/.env`);
  }
};
