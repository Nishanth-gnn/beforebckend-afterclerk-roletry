
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Define Profile interface based on our database structure
export interface Profile {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// Define our own User interface based on what we're using from Clerk
interface ClerkUser {
  primaryEmailAddress?: {
    emailAddress?: string;
  };
}

// Type for our dynamic table names
type DataTable = 'patient_data' | 'staff_data' | 'admin_data';

// Function to check if a user exists in our profiles table
export const checkUserExists = async (email: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  
  if (error) {
    console.error("Error checking user existence:", error);
    return false;
  }
  
  return !!data;
};

// Function to create a new user profile if they don't exist
export const createUserProfile = async (user: ClerkUser): Promise<string | null> => {
  const email = user.primaryEmailAddress?.emailAddress;
  if (!email) return null;

  // Generate a UUID for the user
  const { data: uuidData } = await supabase.rpc('gen_random_uuid');
  const userId = uuidData;

  // Insert into profiles
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      { 
        id: userId, 
        email: email,
        role: 'patient' // Default role for new users
      }
    ])
    .select()
    .single();
  
  if (error) {
    console.error("Error creating user profile:", error);
    return null;
  }
  
  // Also create an entry in patient_data table
  const { error: patientError } = await supabase
    .from('patient_data' as keyof Database['public']['Tables'])
    .insert([{ user_id: userId }]);
  
  if (patientError) {
    console.error("Error creating patient data:", patientError);
  }
  
  return userId;
};

// Function to get user profile by email
export const getUserProfileByEmail = async (email: string): Promise<Profile | null> => {
  if (!email) return null;
  
  console.log("Looking up profile for email:", email);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  console.log("Profile data returned:", data);
  return data as Profile | null;
};

// Function to get user data based on role
export const getUserData = async (userId: string, role: string) => {
  if (!userId || !role) return null;
  
  let tableName: DataTable | null = null;
  
  // Determine which table to query based on user role
  switch (role) {
    case 'patient':
      tableName = 'patient_data';
      break;
    case 'staff':
      tableName = 'staff_data';
      break;
    case 'admin':
      tableName = 'admin_data';
      break;
    default:
      return null;
  }
  
  if (!tableName) return null;
  
  const { data, error } = await supabase
    .from(tableName as keyof Database['public']['Tables'])
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error(`Error fetching ${role} data:`, error);
    return null;
  }
  
  return data;
};

// Function to update user data
export const updateUserData = async (userId: string, role: string, updates: any) => {
  if (!userId || !role) return false;
  
  let tableName: DataTable | null = null;
  
  switch (role) {
    case 'patient':
      tableName = 'patient_data';
      break;
    case 'staff':
      tableName = 'staff_data';
      break;
    case 'admin':
      tableName = 'admin_data';
      break;
    default:
      return false;
  }
  
  if (!tableName) return false;
  
  const { error } = await supabase
    .from(tableName as keyof Database['public']['Tables'])
    .update(updates)
    .eq('user_id', userId);
  
  if (error) {
    console.error(`Error updating ${role} data:`, error);
    return false;
  }
  
  return true;
};
