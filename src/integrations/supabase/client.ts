
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bhjrervgmixlhmcinwbd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoanJlcnZnbWl4bGhtY2lud2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NDg0MzYsImV4cCI6MjA2MzEyNDQzNn0.kMug4Qw4swWXL6oFP1dFCPJfYtggPo3Un5jZwUcnDNk";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'supabase.auth.token',
  },
});

// Export a function to get Supabase client with Clerk JWT
export const getSupabaseWithClerk = async (getToken: () => Promise<string>) => {
  const clerkToken = await getToken();
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
  });
};
