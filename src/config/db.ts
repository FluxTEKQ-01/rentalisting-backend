import { supabaseClient } from './supabase.js';
import { seedDatabase } from '../utils/seeder.js';

export let isDatabaseConnected = false;

export async function connectDB(): Promise<void> {
  try {
    console.log('Testing Supabase connection...');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');

    // Lightweight test: select a single row from users to verify connectivity
    const { error, data } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error.code, error.message);
      throw error;
    }

    console.log('✓ Supabase connected successfully');
    isDatabaseConnected = true;
    await seedDatabase();
  } catch (error: any) {
    console.error('Supabase connection failed:', error.message);
    console.error('Error details:', error.code || 'unknown code', error.details || '');
    console.warn('⚠️ WARNING: Supabase connection failed. Running in Local In-Memory Mock Fallback Mode. App features will remain fully functional.');
    isDatabaseConnected = false;
  }
}
