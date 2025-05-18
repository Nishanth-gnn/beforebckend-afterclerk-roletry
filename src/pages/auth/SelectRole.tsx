
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { toast } from "sonner";
import { User, Calendar, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserProfileByEmail, updateUserData } from "@/utils/clerkSupabaseIntegration";

const SelectRole = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <Layout>
        <div className="page-container py-12 text-center">
          <p>Please sign in to continue.</p>
        </div>
      </Layout>
    );
  }

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
  };

  const handleSubmit = async () => {
    if (!selectedRole) {
      toast.error("Please select a role to continue");
      return;
    }

    try {
      setLoading(true);
      const email = user.primaryEmailAddress?.emailAddress;
      
      if (!email) {
        toast.error("Email address not found");
        return;
      }
      
      // Get user profile
      const profile = await getUserProfileByEmail(email);
      
      if (!profile) {
        toast.error("User profile not found");
        return;
      }

      // Update user's role in the profiles table if it's different
      if (profile.role !== selectedRole) {
        const { error } = await supabase
          .from('profiles')
          .update({ role: selectedRole })
          .eq('id', profile.id);
          
        if (error) {
          console.error("Error updating role:", error);
          toast.error("Failed to update role");
          return;
        }
        
        // Check if we need to create role-specific data entry
        if (selectedRole !== profile.role) {
          const tableName = `${selectedRole}_data`;
          
          // Create new entry in the appropriate table
          const { error: createError } = await supabase
            .from(tableName)
            .insert([{ user_id: profile.id }]);
            
          if (createError) {
            console.error("Error creating role data:", createError);
            // This is not critical, so we'll continue anyway
          }
        }
      }
      
      toast.success(`Role set to ${selectedRole}`);
      
      // Navigate based on selected role
      switch (selectedRole) {
        case "patient":
          navigate("/patient");
          break;
        case "staff":
          navigate("/staff");
          break;
        case "admin":
          navigate("/admin");
          break;
        default:
          toast.error("Invalid role selection");
      }
    } catch (error) {
      console.error("Error handling role selection:", error);
      toast.error("An error occurred while setting your role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-container py-12 flex justify-center">
        <div className="w-full max-w-4xl">
          {/* User Profile Card */}
          <Card className="mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white rounded-full p-2 w-24 h-24 flex items-center justify-center">
                  {user.imageUrl ? (
                    <img src={user.imageUrl} alt={user.fullName || "User"} className="rounded-full w-20 h-20 object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-bold">{user.fullName || "Welcome"}</h2>
                  <p className="text-blue-100">{user.primaryEmailAddress?.emailAddress}</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-lg font-medium text-center mb-2">Successfully authenticated with Clerk!</p>
                <p className="text-center text-gray-600">Please select your role to continue.</p>
              </div>
            </CardContent>
          </Card>

          <CardTitle className="text-2xl mb-6">Select Your Role</CardTitle>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${selectedRole === "patient" ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleRoleSelect("patient")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto bg-blue-100 rounded-full p-4 mb-2">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Patient</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Book appointments, track your queue position, and manage your healthcare.
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${selectedRole === "staff" ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleRoleSelect("staff")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto bg-blue-100 rounded-full p-4 mb-2">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage patient queues, update appointments, and access patient information.
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${selectedRole === "admin" ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleRoleSelect("admin")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto bg-blue-100 rounded-full p-4 mb-2">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Configure system settings, manage departments and staff, and monitor performance.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={handleSubmit} 
              size="lg" 
              className="px-8"
              disabled={loading}
            >
              {loading ? "Processing..." : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SelectRole;
