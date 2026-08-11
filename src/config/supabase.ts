import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Initialize Supabase client with service-role authentication
// Service role has full access to all tables; must NEVER be exposed to the frontend
export const supabaseClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
});

// Database type definitions (auto-generated from Supabase schema if available)
// For now, use `any` for query results; refine as needed per repository
export type Database = any;
