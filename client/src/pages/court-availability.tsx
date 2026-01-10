import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  Clock
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isToday, isSameDay } from "date-fns";
import type { Court, BookingWithDetails } from "@shared/schema";
import BookingModal from "@/components/court/booking-modal";

type ViewType = "day" | "week" | "month";

interface TimeSlot {
  hour: number;
  minute: number;
  display: string;
}

interface CalendarBooking {
  booking: BookingWithDetails;
  startTime: Date;
  endTime: Date;
  position: {
    top: number;
    height: number;
    left: number;
    width: number;
  };
}

export default function CourtAvailability() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [dragStart, setDragStart] = useState<{ court: string; time: Date } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ court: string; time: Date } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Check permissions
  const canManage = user?.role === "admin" || user?.role === "staff";

  // Fetch courts and bookings
  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: bookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (!canManage) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Generate time slots based on court operating hours
  const timeSlots: TimeSlot[] = [];
  
  // Get earliest open time and latest close time from all courts
  let earliestOpen = 6; // Default 6 AM
  let latestClose = 23; // Default 11 PM
  
  if (courts.length > 0) {
    courts.forEach(court => {
      const [openHour] = court.openTime.split(':').map(Number);
      const [closeHour] = court.closeTime.split(':').map(Number);
      if (openHour < earliestOpen) earliestOpen = openHour;
      if (closeHour > latestClose) latestClose = closeHour;
    });
  }
  
  for (let hour = earliestOpen; hour <= latestClose; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayMinute = minute.toString().padStart(2, '0');
      
      timeSlots.push({
        hour,
        minute,
        display: `${displayHour}:${displayMinute} ${ampm}`
      });
    }
  }

  // Filter bookings by search query
  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      booking.user?.firstName?.toLowerCase().includes(searchLower) ||
      booking.user?.lastName?.toLowerCase().includes(searchLower) ||
      booking.court?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Get booking status color
  const getBookingColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-brand-primary text-white";
      case "pending": return "bg-brand-accent text-black";
      case "cancelled": return "bg-gray-400 text-white";
      case "coach_lesson": return "bg-brand-dark text-white";
      case "maintenance": return "bg-orange-500 text-white";
      default: return "bg-brand-secondary text-white";
    }
  };

  // Navigate dates
  const navigateDate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentDate(new Date());
      return;
    }

    const modifier = direction === "next" ? 1 : -1;
    
    switch (viewType) {
      case "day":
        setCurrentDate(prev => direction === "next" ? addDays(prev, 1) : subDays(prev, 1));
        break;
      case "week":
        setCurrentDate(prev => direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1));
        break;
      case "month":
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + modifier, 1));
        break;
    }
  };

  // Get visible dates based on view type
  const getVisibleDates = () => {
    switch (viewType) {
      case "day":
        return [currentDate];
      case "week": {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
      }
      case "month": {
        const start = startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
        return Array.from({ length: 35 }, (_, i) => addDays(start, i));
      }
      default:
        return [currentDate];
    }
  };

  const visibleDates = getVisibleDates();

  // Handle time slot click
  const handleTimeSlotClick = (court: Court, date: Date, timeSlot: TimeSlot) => {
    const slotDateTime = new Date(date);
    slotDateTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
    
    setSelectedBooking({
      id: '',
      userId: '',
      courtId: court.id,
      date: format(date, 'yyyy-MM-dd'),
      startTime: timeSlot.display,
      endTime: format(new Date(slotDateTime.getTime() + 60 * 60 * 1000), 'HH:mm'),
      duration: 60,
      status: 'pending',
      totalAmount: court.hourlyRate,
      court,
      user: null,
      payment: null,
      createdAt: new Date(),
      type: 'regular' as const,
      isPaid: false,
      paymentMethod: null,
      notes: null
    } as BookingWithDetails);
    setIsBookingModalOpen(true);
  };

  // Handle booking double-click
  const handleBookingDoubleClick = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Court Availability</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewType === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewType("day")}
                className={viewType === "day" ? "bg-brand-primary" : ""}
                data-testid="button-day-view"
              >
                Day
              </Button>
              <Button
                variant={viewType === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewType("week")}
                className={viewType === "week" ? "bg-brand-primary" : ""}
                data-testid="button-week-view"
              >
                Week
              </Button>
              <Button
                variant={viewType === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewType("month")}
                className={viewType === "month" ? "bg-brand-primary" : ""}
                data-testid="button-month-view"
              >
                Month
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search reservations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search"
              />
            </div>

            {/* Date Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("prev")}
                data-testid="button-prev-date"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("today")}
                data-testid="button-today"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("next")}
                data-testid="button-next-date"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-lg font-semibold text-gray-900">
              {format(currentDate, "MMMM yyyy")}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white border-b border-gray-200 px-4 py-1 flex-shrink-0">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-brand-primary"></div>
            <span className="text-sm text-gray-600">Confirmed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-brand-accent"></div>
            <span className="text-sm text-gray-600">Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-brand-dark"></div>
            <span className="text-sm text-gray-600">Coach Lesson</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span className="text-sm text-gray-600">Maintenance</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-gray-400"></div>
            <span className="text-sm text-gray-600">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full flex">
          {/* Time column - sticky positioning */}
          <div className="w-16 bg-white border-r border-gray-200 flex-shrink-0">
            <div className="h-10 border-b border-gray-200 bg-white"></div> {/* Header spacer */}
            <div className="overflow-y-auto h-[calc(100%-2.5rem)]">
              {timeSlots.map((slot, index) => (
                <div
                  key={index}
                  className="h-10 border-b border-gray-100 flex items-center justify-center text-xs text-gray-600 px-1 bg-white"
                >
                  {slot.minute === 0 ? slot.display : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Courts and schedule */}
          <div className="flex-1 overflow-auto" ref={calendarRef}>
            {/* Court headers - sticky positioning */}
            <div className="bg-white border-b border-gray-200 flex sticky top-0 z-10 h-10">
              {courts.map((court) => (
                <div
                  key={court.id}
                  className="flex-1 min-w-40 border-r border-gray-200 flex items-center justify-center bg-gray-50"
                >
                  <div className="text-center">
                    <div className="font-medium text-sm text-gray-900">{court.name}</div>
                    <div className="text-xs text-gray-500">{court.surfaceType} • ${court.hourlyRate}/hr</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots grid */}
            <div>
              {timeSlots.map((slot, timeIndex) => (
                <div 
                  key={timeIndex} 
                  className="flex border-b border-gray-100 h-10"
                >
                  {courts.map((court) => (
                    <div
                      key={court.id}
                      className="flex-1 min-w-40 border-r border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors relative"
                      onClick={() => handleTimeSlotClick(court, currentDate, slot)}
                      data-testid={`slot-${court.id}-${slot.display}`}
                    >
                      {/* Render bookings in this slot */}
                      {filteredBookings
                        .filter(booking => {
                          if (booking.courtId !== court.id) return false;
                          const bookingDate = new Date(booking.date);
                          const [startHour, startMinute] = booking.startTime.split(':').map(Number);
                          return (
                            isSameDay(bookingDate, currentDate) &&
                            startHour === slot.hour &&
                            startMinute === slot.minute
                          );
                        })
                        .map((booking) => (
                          <div
                            key={booking.id}
                            className={`absolute inset-1 rounded px-2 py-1 text-xs font-medium cursor-pointer ${getBookingColor(booking.status)} transition-all hover:shadow-md`}
                            onDoubleClick={() => handleBookingDoubleClick(booking)}
                            data-testid={`booking-${booking.id}`}
                          >
                            <div className="truncate">
                              {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'Reserved'}
                            </div>
                            <div className="text-xs opacity-75">
                              {booking.startTime} - {booking.endTime}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedBooking(null);
        }}
        initialCourt={selectedBooking?.courtId}
        initialDate={selectedBooking?.date}
        initialTime={selectedBooking?.startTime}
        booking={selectedBooking}
        courts={courts}
      />
    </div>
  );
}