import { supabaseClient } from './supabase.js';
import { seedDatabase } from '../utils/seeder.js';

export let isDatabaseConnected = false;

export async function connectDB(): Promise<void> {
  try {
    console.log('Testing Supabase connection...');
    // Lightweight test: select a single row from users to verify connectivity
    const { error, data } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✓ Supabase connected successfully');
    isDatabaseConnected = true;
    await seedDatabase();
  } catch (error: any) {
    console.error('Supabase connection failed:', error.message);
    console.warn('⚠️ WARNING: Supabase connection failed. Running in Local In-Memory Mock Fallback Mode. App features will remain fully functional.');
    isDatabaseConnected = false;
  }
}
