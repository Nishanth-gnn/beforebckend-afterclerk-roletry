
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Define our own User interface based on what we're using from Clerk
interface ClerkUser {
  primaryEmailAddress?: {
    emailAddress?: string;
  };
}

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

  // Explicitly type the table names with string literals
  const profileTable = 'profiles' as const;
  const patientTable = 'patient_data' as const;

  // Insert into profiles
  const { data, error } = await supabase
    .from(profileTable)
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
    .from(patientTable)
    .insert([{ user_id: userId }]);
  
  if (patientError) {
    console.error("Error creating patient data:", patientError);
  }
  
  return userId;
};

// Function to get user profile by email
export const getUserProfileByEmail = async (email: string) => {
  if (!email) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  return data;
};

// Function to get user data based on role
export const getUserData = async (userId: string, role: string) => {
  if (!userId || !role) return null;
  
  // Define a literal type for table names to satisfy TypeScript
  let tableName: 'patient_data' | 'staff_data' | 'admin_data' | null = null;
  
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
    .from(tableName)
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
  
  // Define a literal type for table names to satisfy TypeScript
  let tableName: 'patient_data' | 'staff_data' | 'admin_data' | null = null;
  
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
    .from(tableName)
    .update(updates)
    .eq('user_id', userId);
  
  if (error) {
    console.error(`Error updating ${role} data:`, error);
    return false;
  }
  
  return true;
};
