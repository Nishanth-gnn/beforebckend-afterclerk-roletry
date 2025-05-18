
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUser } from "@clerk/clerk-react";
import { 
  checkUserExists, 
  createUserProfile, 
  getUserProfileByEmail, 
  getUserData 
} from "@/utils/clerkSupabaseIntegration";
import { toast } from "sonner";

type UserDataContextType = {
  userProfile: any;
  userData: any;
  loading: boolean;
  setUserData: (data: any) => void;
  saveChanges: (updates: any) => Promise<boolean>;
};

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const [userProfile, setUserProfile] = useState<any>(null);
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
        // Check if user exists in our database
        const exists = await checkUserExists(email);
        
        if (!exists) {
          // If user doesn't exist and isn't one of our pre-configured users,
          // create a new profile for them
          if (email !== '23071a67e9@vnrvjiet.in' && email !== 'gnishanth2005@gmail.com') {
            await createUserProfile(user);
          } else {
            // These users should already exist from our SQL migration
            console.log("Pre-configured user detected:", email);
          }
        }

        // Get user profile
        const profile = await getUserProfileByEmail(email);
        if (!profile) {
          console.error("Failed to get user profile");
          setLoading(false);
          return;
        }

        setUserProfile(profile);

        // Get role-specific data
        const roleData = await getUserData(profile.id, profile.role);
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
