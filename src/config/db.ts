import mongoose from 'mongoose';
import { env } from './env.js';
import { seedDatabase } from '../utils/seeder.js';

export let isDatabaseConnected = false;

export async function connectDB(): Promise<void> {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected successfully to Atlas!');
    isDatabaseConnected = true;
    await seedDatabase();
  } catch (error: any) {
    console.error('MongoDB Atlas connection failed:', error.message);
    
    // Attempt local MongoDB fallback
    const localUri = 'mongodb://127.0.0.1:27017/rentalisting';
    try {
      console.log(`Attempting to connect to local MongoDB at ${localUri}...`);
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
      console.log('MongoDB connected successfully to Localhost!');
      isDatabaseConnected = true;
      await seedDatabase();
    } catch (localErr: any) {
      console.error('Local MongoDB connection failed:', localErr.message);
      console.warn('⚠️ WARNING: All MongoDB connections failed. Running in Local In-Memory Mock Fallback Mode. App features will remain fully functional.');
      isDatabaseConnected = false;
    }
  }
}
