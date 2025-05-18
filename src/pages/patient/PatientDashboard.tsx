
import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import QueueStatusCard from "@/components/patient/QueueStatusCard";
import QueueStatusIndicator from "@/components/patient/QueueStatusIndicator";
import AppointmentCard from "@/components/patient/AppointmentCard";
import AppointmentForm from "@/components/patient/AppointmentForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DatePicker from "@/components/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserData } from "@/contexts/UserDataContext";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: string;
  department: string;
  doctor: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
}

const PatientDashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { userProfile, userData, loading, saveChanges } = useUserData();
  
  const [activeAppointment, setActiveAppointment] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<'waiting' | 'called' | 'completed'>('waiting');
  const [queuePosition, setQueuePosition] = useState(3);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);

  // Reschedule dialog state
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    // Redirect if no user or wrong role
    if (!loading && (!userProfile || userProfile.role !== 'patient')) {
      if (!user) {
        navigate('/auth/select-role');
        return;
      } else if (userProfile && userProfile.role !== 'patient') {
        navigate(`/${userProfile.role}`);
        return;
      }
    }

    // Load user data when available
    if (userData) {
      if (userData.appointments && Array.isArray(userData.appointments)) {
        const now = new Date();
        const upcoming: Appointment[] = [];
        const past: Appointment[] = [];
        
        userData.appointments.forEach((apt: Appointment) => {
          const aptDate = new Date(apt.date);
          if (aptDate >= now || apt.status === 'scheduled') {
            upcoming.push(apt);
          } else {
            past.push(apt);
          }
        });
        
        setUpcomingAppointments(upcoming);
        setPastAppointments(past);
      }
      
      // Load other preferences if they exist
      if (userData.preferences) {
        if (userData.preferences.queueStatus) {
          setCurrentStatus(userData.preferences.queueStatus);
        }
        if (userData.preferences.queuePosition !== undefined) {
          setQueuePosition(userData.preferences.queuePosition);
        }
      }
    } else if (!loading && userProfile) {
      // Initialize with default appointments if user data is empty
      const defaultUpcoming = [
        {
          id: "apt1",
          department: "Cardiology",
          doctor: "Dr. Sarah Smith",
          date: "2023-06-15",
          time: "10:00 AM",
          status: "scheduled",
          notes: "Annual heart checkup"
        },
        {
          id: "apt2",
          department: "General Medicine",
          doctor: "Dr. Michael Johnson",
          date: "2023-06-28",
          time: "2:30 PM",
          status: "scheduled"
        }
      ];
      
      const defaultPast = [
        {
          id: "apt3",
          department: "Dermatology",
          doctor: "Dr. Emily Chen",
          date: "2023-05-20",
          time: "11:15 AM",
          status: "completed",
          notes: "Skin condition follow-up"
        },
        {
          id: "apt4",
          department: "Orthopedics",
          doctor: "Dr. Robert Williams",
          date: "2023-04-10",
          time: "9:00 AM",
          status: "completed"
        }
      ];
      
      setUpcomingAppointments(defaultUpcoming);
      setPastAppointments(defaultPast);
      
      // Save these defaults to the database
      saveChanges({
        appointments: [...defaultUpcoming, ...defaultPast]
      });
    }
  }, [userData, userProfile, loading, navigate, user, saveChanges]);

  // Mock patient data
  const patientData = {
    name: user?.fullName || "Patient",
    patientId: userData?.id || "Loading..."
  };

  // Mock queue status
  const queueStatus = {
    position: queuePosition,
    estimatedWaitTime: 15,
    totalInQueue: 8,
    department: "Cardiology",
    averageProcessingTime: 12
  };

  // Demo function to simulate status changes
  const simulateStatusChange = async () => {
    let newStatus: 'waiting' | 'called' | 'completed';
    let newPosition = queuePosition;
    
    if (currentStatus === 'waiting') {
      newStatus = 'called';
      toast.success("You've been called! Please proceed to your designated room.");
    } else if (currentStatus === 'called') {
      newStatus = 'completed';
      toast.success("Your appointment has been completed!");
    } else {
      newStatus = 'waiting';
      newPosition = Math.floor(Math.random() * 5) + 1;
      toast.info("You've been added to the waiting queue.");
    }
    
    setCurrentStatus(newStatus);
    setQueuePosition(newPosition);
    
    // Save this preference to Supabase
    await saveChanges({
      preferences: {
        ...userData?.preferences,
        queueStatus: newStatus,
        queuePosition: newPosition
      }
    });
  };

  const handleSubmitAppointment = async (data: any) => {
    // Create a new appointment from submitted form data
    const newAppointment: Appointment = {
      id: `apt${Date.now().toString()}`, // Generate a unique ID
      department: data.department,
      doctor: data.doctor,
      date: data.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
      time: data.time,
      status: "scheduled",
      notes: data.notes || undefined
    };
    
    // Add the new appointment to upcoming appointments
    const updatedAppointments = [...upcomingAppointments, newAppointment];
    setUpcomingAppointments(updatedAppointments);
    toast.success("Appointment request submitted successfully!");
    
    // Save to database
    await saveChanges({
      appointments: [...updatedAppointments, ...pastAppointments]
    });
    
    // Navigate to the upcoming appointments tab
    const upcomingTabTrigger = document.querySelector('[data-value="upcoming"]') as HTMLElement;
    if (upcomingTabTrigger) {
      upcomingTabTrigger.click();
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    setAppointmentToReschedule(appointment);
    setNewDate(new Date(appointment.date));
    setNewTime(appointment.time);
    setRescheduleDialogOpen(true);
  };

  const handleCancel = async (id: string) => {
    // Remove the appointment from upcoming appointments
    const updatedAppointments = upcomingAppointments.filter(apt => apt.id !== id);
    setUpcomingAppointments(updatedAppointments);
    toast.success("Appointment cancelled successfully.");
    
    // Save to database
    await saveChanges({
      appointments: [...updatedAppointments, ...pastAppointments]
    });
  };

  const handleRescheduleSubmit = async () => {
    if (!appointmentToReschedule || !newDate || !newTime) {
      toast.error("Please select a new date and time.");
      return;
    }

    // Update the appointment with new date and time
    const updatedAppointments = upcomingAppointments.map(apt => {
      if (apt.id === appointmentToReschedule.id) {
        return {
          ...apt,
          date: newDate.toISOString().split('T')[0],
          time: newTime,
        };
      }
      return apt;
    });

    setUpcomingAppointments(updatedAppointments);
    setRescheduleDialogOpen(false);
    setAppointmentToReschedule(null);
    toast.success("Appointment rescheduled successfully!");
    
    // Save to database
    await saveChanges({
      appointments: [...updatedAppointments, ...pastAppointments]
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-container py-12 text-center">
          <p>Loading user data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Patient Dashboard</h1>
            <p className="text-gray-600">Welcome, {patientData.name} • ID: {patientData.patientId}</p>
          </div>
        </div>

        {/* Queue Status Section with the indicator */}
        <QueueStatusIndicator 
          status={currentStatus} 
          position={currentStatus === 'waiting' ? queuePosition : undefined} 
        />
        
        {currentStatus === 'waiting' && (
          <QueueStatusCard queueStatus={queueStatus} />
        )}

        {/* Button to simulate status change (for demo purposes) */}
        <div className="mb-6">
          <Button onClick={simulateStatusChange} variant="outline">
            Simulate Status Change (Demo)
          </Button>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="upcoming" className="mt-6">
          <TabsList className="mb-8">
            <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
            <TabsTrigger value="past">Past Appointments</TabsTrigger>
            <TabsTrigger value="book">Book Appointment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id}
                  appointment={appointment}
                  type="upcoming"
                  onReschedule={handleReschedule}
                  onCancel={handleCancel}
                />
              ))}
              {upcomingAppointments.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">No upcoming appointments.</p>
                    <Button 
                      className="mt-4"
                      onClick={() => {
                        const bookTab = document.querySelector('[data-value="book"]') as HTMLElement;
                        if (bookTab) {
                          bookTab.click();
                        }
                      }}
                    >
                      Book an Appointment
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="past">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id}
                  appointment={appointment}
                  type="past"
                />
              ))}
              {pastAppointments.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">No past appointments found.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="book">
            <div className="max-w-2xl mx-auto">
              <AppointmentForm onSubmit={handleSubmitAppointment} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">New Date</Label>
              <DatePicker 
                date={newDate} 
                onDateChange={(date) => setNewDate(date as Date)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New Time</Label>
              <Select defaultValue={newTime} onValueChange={setNewTime}>
                <SelectTrigger id="reschedule-time">
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:00 AM">9:00 AM</SelectItem>
                  <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                  <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                  <SelectItem value="1:00 PM">1:00 PM</SelectItem>
                  <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                  <SelectItem value="3:00 PM">3:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRescheduleSubmit}>
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default PatientDashboard;
