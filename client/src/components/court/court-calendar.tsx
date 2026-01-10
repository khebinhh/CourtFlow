import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import BookingModal from "./booking-modal";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

export default function CourtCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCourt, setSelectedCourt] = useState<string>("all");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ courtId: string; time: string } | null>(null);

  const { data: courts, isLoading: courtsLoading } = useQuery({
    queryKey: ["/api/courts"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings", { date: selectedDate }],
    enabled: !!selectedDate,
  });

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", 
    "20:00", "21:00", "22:00"
  ];

  const filteredCourts = selectedCourt === "all" 
    ? courts || [] 
    : courts?.filter(court => court.id === selectedCourt) || [];

  const getSlotStatus = (courtId: string, time: string) => {
    if (!bookings) return "available";
    
    const court = courts?.find(c => c.id === courtId);
    if (court?.status === "maintenance") return "maintenance";
    
    const booking = bookings.find(b => 
      b.courtId === courtId && 
      b.startTime <= time && 
      b.endTime > time &&
      b.status !== "cancelled"
    );
    
    if (booking) {
      return booking.type === "lesson" ? "coach-lesson" : "booked";
    }
    
    return "available";
  };

  const getSlotContent = (courtId: string, time: string) => {
    const status = getSlotStatus(courtId, time);
    const booking = bookings?.find(b => 
      b.courtId === courtId && 
      b.startTime <= time && 
      b.endTime > time &&
      b.status !== "cancelled"
    );

    switch (status) {
      case "available":
        return "Available";
      case "maintenance":
        return "Maintenance";
      case "coach-lesson":
        return booking?.user ? `Coach ${booking.user.firstName}` : "Coach Lesson";
      case "booked":
        return booking?.user ? `${booking.user.firstName} ${booking.user.lastName.charAt(0)}.` : "Booked";
      default:
        return "Available";
    }
  };

  const handleSlotClick = (courtId: string, time: string) => {
    const status = getSlotStatus(courtId, time);
    if (status === "available") {
      setSelectedSlot({ courtId, time });
      setIsBookingModalOpen(true);
    }
  };

  const nextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const prevDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (courtsLoading || bookingsLoading) {
    return (
      <Card className="border border-gray-100">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-gray-100" data-testid="card-court-calendar">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle>Court Availability</CardTitle>
            <div className="flex items-center space-x-4">
              <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                <SelectTrigger className="w-40" data-testid="select-court-filter">
                  <SelectValue placeholder="All Courts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courts</SelectItem>
                  {courts?.map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name} - {court.surfaceType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                className="bg-tennis-green hover:bg-tennis-green/90"
                onClick={() => setIsBookingModalOpen(true)}
                data-testid="button-new-booking"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-semibold text-gray-900">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={prevDay}
                data-testid="button-prev-day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={nextDay}
                data-testid="button-next-day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Time</th>
                  {filteredCourts.map((court) => (
                    <th key={court.id} className="text-center py-3 px-4 font-medium text-gray-700">
                      {court.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time) => (
                  <tr key={time} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-700">
                      {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </td>
                    {filteredCourts.map((court) => {
                      const status = getSlotStatus(court.id, time);
                      const content = getSlotContent(court.id, time);
                      
                      return (
                        <td key={court.id} className="py-3 px-4">
                          {status === "available" ? (
                            <button
                              className="w-full h-12 rounded-lg court-available text-white font-medium text-sm shadow-sm hover:shadow-md transition-all"
                              onClick={() => handleSlotClick(court.id, time)}
                              data-testid={`slot-${court.id}-${time}`}
                            >
                              {content}
                            </button>
                          ) : (
                            <div 
                              className={`w-full h-12 rounded-lg text-white font-medium text-sm flex items-center justify-center shadow-sm ${
                                status === "booked" ? "court-booked" :
                                status === "maintenance" ? "court-maintenance" :
                                status === "coach-lesson" ? "coach-lesson" :
                                "court-available"
                              }`}
                              data-testid={`slot-${court.id}-${time}`}
                            >
                              {content}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-center space-x-6 mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded court-available"></div>
              <span className="text-sm text-gray-600">Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded court-booked"></div>
              <span className="text-sm text-gray-600">Booked</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded coach-lesson"></div>
              <span className="text-sm text-gray-600">Coach Lesson</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded court-maintenance"></div>
              <span className="text-sm text-gray-600">Maintenance</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedSlot(null);
        }}
        initialCourt={selectedSlot?.courtId}
        initialDate={selectedDate}
        initialTime={selectedSlot?.time}
      />
    </>
  );
}
