
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUser } from "@clerk/clerk-react";
import { 
  checkUserExists, 
  createUserProfile, 
  getUserProfileByEmail, 
  getUserData,
  updateUserData,
  Profile
} from "@/utils/clerkSupabaseIntegration";
import { toast } from "sonner";

type UserDataContextType = {
  userProfile: Profile | null;
  userData: any;
  loading: boolean;
  setUserData: (data: any) => void;
  saveChanges: (updates: any) => Promise<boolean>;
};

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupUserData = async () => {
      if (!isLoaded || !user) {
        setLoading(false);
        return;
      }

      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) {
        setLoading(false);
        return;
      }

      try {
        console.log("Setting up user data for email:", email);
        
        // Check if user exists in our database
        const exists = await checkUserExists(email);
        console.log("User exists in database:", exists);
        
        if (!exists) {
          // Create a new profile for the user if they don't exist
          console.log("Creating new user profile");
          await createUserProfile(user);
        }

        // Get user profile
        const profile = await getUserProfileByEmail(email);
        if (!profile) {
          console.error("Failed to get user profile");
          toast.error("User profile not found. Please try signing out and in again.");
          setLoading(false);
          return;
        }

        console.log("Retrieved user profile:", profile);
        setUserProfile(profile);

        // Get role-specific data
        const roleData = await getUserData(profile.id, profile.role);
        console.log("Retrieved role data:", roleData);
        setUserData(roleData || {});
      } catch (error) {
        console.error("Error setting up user data:", error);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    setupUserData();
  }, [user, isLoaded]);

  // Function to save user changes to database
  const saveChanges = async (updates: any): Promise<boolean> => {
    if (!userProfile) return false;

    try {
      const { id: userId, role } = userProfile;
      
      // Merge current data with updates
      const updatedData = { ...userData, ...updates, updated_at: new Date().toISOString() };
      setUserData(updatedData);
      
      // Update in database
      const success = await updateUserData(userId, role, updates);
      
      if (success) {
        toast.success("Changes saved successfully");
        return true;
      } else {
        toast.error("Failed to save changes");
        return false;
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("An error occurred while saving changes");
      return false;
    }
  };

  const value = {
    userProfile,
    userData,
    loading,
    setUserData,
    saveChanges
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
};
