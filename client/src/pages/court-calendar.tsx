import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimePicker } from "@/components/ui/time-picker";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  DollarSign,
  X,
} from "lucide-react";
import {
  format,
  addDays,
  subDays,
  startOfDay,
  isSameDay,
  isToday,
} from "date-fns";
import type { Court, BookingWithDetails } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface TimeSlot {
  hour: number;
  minute: number;
  time: string;
  display: string;
}

interface BookingFormData {
  courtId: string;
  date: string;
  startTime: string;
  duration: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerType: string;
  paymentMethod: string;
  notes: string;
  bookingType: "regular" | "class" | "event" | "maintenance";
  endDate?: string;
  description?: string;
  recurringDays?: string[];
  recurringEndDate?: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
}

export default function CourtCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [selectedSlot, setSelectedSlot] = useState<{
    court: Court;
    time: TimeSlot;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    court: Court;
    time: TimeSlot;
  } | null>(null);
  const [dragEnd, setDragEnd] = useState<{
    court: Court;
    time: TimeSlot;
  } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [editingBooking, setEditingBooking] =
    useState<BookingWithDetails | null>(null);
  const [editFormData, setEditFormData] = useState<{
    courtId: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    notes: string;
    bookingType: string;
    endDate: string;
    description: string;
    recurringDays: string[];
    recurringEndDate: string;
  }>({
    courtId: "",
    date: "",
    startTime: "",
    endTime: "",
    status: "",
    notes: "",
    bookingType: "regular",
    endDate: "",
    description: "",
    recurringDays: [],
    recurringEndDate: "",
  });
  const [hoveredBooking, setHoveredBooking] =
    useState<BookingWithDetails | null>(null);

  const [formData, setFormData] = useState<BookingFormData>({
    courtId: "",
    date: "",
    startTime: "",
    duration: "1",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerType: "guest",
    paymentMethod: "credit_card",
    notes: "",
    bookingType: "regular",
    endDate: "",
    description: "",
    recurringDays: [],
    recurringEndDate: "",
  });

  // Check permissions
  const canManage = user?.role === "admin" || user?.role === "staff";

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fixed row height for 15-minute slots (60px per hour for good spacing like Apple Calendar)
  const SLOT_HEIGHT = 15; // pixels per 15-minute slot = 60px per hour
  const HEADER_HEIGHT = 48; // pixels for court header row
  const START_HOUR = 6;
  const END_HOUR = 22;

  // Generate time slots from 6 AM to 10 PM with 15-minute intervals
  const timeSlots: TimeSlot[] = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? "PM" : "AM";
      const display = `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`;

      timeSlots.push({ hour, minute, time, display });
    }
  }

  // Calculate total grid height (17 hours × 4 slots/hour × 15px = 1020px)
  const totalGridHeight = timeSlots.length * SLOT_HEIGHT;

  // Fetch courts, bookings, and customers
  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  const { data: bookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/users"],
  });

  // Filter bookings for selected date
  const dayBookings = bookings.filter((booking) => {
    // Parse date string properly to avoid timezone issues
    const bookingDate = new Date(booking.date + "T00:00:00");
    return isSameDay(bookingDate, selectedDate);
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/bookings", "POST", data);
    },
    onSuccess: async (booking) => {
      // Create payment
      const paymentData = {
        bookingId: booking.id,
        amount: calculateTotal(),
        method: formData.paymentMethod,
      };

      try {
        await apiRequest("/api/payments", "POST", paymentData);

        // Invalidate all relevant queries immediately
        await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        await queryClient.refetchQueries({ queryKey: ["/api/bookings"] });

        toast({
          title: "Booking Created",
          description: `Court reserved for ${formData.customerName}`,
        });

        setPopoverOpen(false);
        resetForm();
      } catch (error) {
        toast({
          title: "Payment Failed",
          description: "Booking created but payment failed.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking.",
        variant: "destructive",
      });
    },
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return await apiRequest(`/api/bookings/${id}`, "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Updated",
        description: "Booking has been updated successfully",
      });
      setEditingBooking(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  // Delete booking mutation
  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/bookings/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Deleted",
        description: "Booking has been deleted successfully",
      });
      setEditingBooking(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    },
  });

  const calculateTotal = () => {
    // Class, Event, and Maintenance bookings are FREE
    if (
      formData.bookingType === "class" ||
      formData.bookingType === "event" ||
      formData.bookingType === "maintenance"
    ) {
      return "0.00";
    }

    const court = courts.find((c) => c.id === formData.courtId);
    if (!court) return "0.00";

    const hours = parseFloat(formData.duration);
    const rate = parseFloat(court.hourlyRate);
    const subtotal = hours * rate;
    const tax = subtotal * 0.1;

    return (subtotal + tax).toFixed(2);
  };

  const calculateEndTime = (startTime: string, duration: string) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const durationHours = parseFloat(duration);
    const durationMinutes = (durationHours % 1) * 60;

    let endMinutes = minutes + durationMinutes;
    let endHours = hours + Math.floor(durationHours);

    // Handle minute overflow
    if (endMinutes >= 60) {
      endHours += Math.floor(endMinutes / 60);
      endMinutes = endMinutes % 60;
    }

    // Round minutes to nearest integer to avoid floating point issues
    endMinutes = Math.round(endMinutes);

    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  const handleTimeSlotClick = (
    court: Court,
    slot: TimeSlot,
    event: React.MouseEvent,
  ) => {
    if (!canManage) return;

    setSelectedSlot({ court, time: slot });
    setFormData({
      ...formData,
      courtId: court.id,
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime: slot.time,
    });

    setPopoverOpen(true);
  };

  const handleMouseDown = (court: Court, slot: TimeSlot) => {
    if (!canManage) return;
    setIsDragging(true);
    setDragStart({ court, time: slot });
    setDragEnd({ court, time: slot });
  };

  const handleMouseEnter = (court: Court, slot: TimeSlot) => {
    if (isDragging && dragStart && dragStart.court.id === court.id) {
      setDragEnd({ court, time: slot });
    }
  };

  const handleMouseUp = () => {
    if (
      isDragging &&
      dragStart &&
      dragEnd &&
      dragStart.court.id === dragEnd.court.id
    ) {
      const startIndex = timeSlots.findIndex(
        (s) => s.time === dragStart.time.time,
      );
      const endIndex = timeSlots.findIndex((s) => s.time === dragEnd.time.time);
      // Normalize indices for consistent calculation regardless of drag direction
      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);
      // Each slot is 15 minutes = 0.25 hours, +1 to include the ending slot
      const duration = (maxIndex - minIndex + 1) * 0.25;

      const startSlot = startIndex <= endIndex ? dragStart : dragEnd;

      setFormData({
        ...formData,
        courtId: startSlot.court.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: startSlot.time.time,
        duration: duration.toString(),
      });

      setSelectedSlot(startSlot);
      setPopoverOpen(true);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...formData,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      customerPhone: customer.phone || "",
      customerType: customer.role,
    });
    setCustomerSearchTerm(""); // Clear search to hide dropdown immediately
    setIsNewCustomer(false);
  };

  const handleNewCustomer = () => {
    setIsNewCustomer(true);
    setSelectedCustomer(null);
    setFormData({
      ...formData,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerType: "guest",
    });
    setCustomerSearchTerm("");
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      `${customer.firstName} ${customer.lastName}`
        .toLowerCase()
        .includes(customerSearchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on booking type
    if (
      (formData.bookingType === "regular" ||
        formData.bookingType === "event") &&
      (!formData.customerName || !formData.customerEmail)
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in customer details.",
        variant: "destructive",
      });
      return;
    }

    if (formData.bookingType === "event" && !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please provide event description.",
        variant: "destructive",
      });
      return;
    }

    if (formData.bookingType === "class" && !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please provide class name.",
        variant: "destructive",
      });
      return;
    }

    if (formData.bookingType === "maintenance" && !formData.notes) {
      toast({
        title: "Missing Information",
        description: "Please provide maintenance notes.",
        variant: "destructive",
      });
      return;
    }

    let customerId = selectedCustomer?.id;

    // Create new customer if needed
    if (isNewCustomer || !selectedCustomer) {
      const customerData = {
        username: formData.customerEmail,
        email: formData.customerEmail,
        firstName: formData.customerName.split(" ")[0] || formData.customerName,
        lastName: formData.customerName.split(" ").slice(1).join(" ") || "",
        phone: formData.customerPhone || null,
        role: formData.customerType,
        password: "temporary123", // Temporary password for guest accounts
      };

      try {
        const newCustomer = await apiRequest(
          "/api/users",
          "POST",
          customerData,
        );
        customerId = newCustomer.id;

        // Refresh customer list
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      } catch (error: any) {
        if (error.message?.includes("already exists")) {
          // Try to find existing user
          try {
            const existingUser = await apiRequest(
              `/api/users/by-email/${formData.customerEmail}`,
              "GET",
            );
            customerId = existingUser.id;
          } catch {
            toast({
              title: "Error",
              description: "Could not create or find customer.",
              variant: "destructive",
            });
            return;
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to create customer account.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    const bookingData = {
      courtId: formData.courtId,
      userId: customerId,
      date: formData.date,
      startTime: formData.startTime,
      endTime: calculateEndTime(formData.startTime, formData.duration),
      type: formData.bookingType,
      totalAmount: calculateTotal(),
      status: "confirmed",
      notes: formData.notes,
      description: formData.description || null,
      recurringDays: formData.recurringDays || null,
      recurringEndDate: formData.recurringEndDate || null,
    };

    createBookingMutation.mutate(bookingData);
  };

  const resetForm = () => {
    setFormData({
      courtId: "",
      date: "",
      startTime: "",
      duration: "1",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerType: "guest",
      paymentMethod: "credit_card",
      notes: "",
      bookingType: "regular",
      endDate: "",
      description: "",
      recurringDays: [],
      recurringEndDate: "",
    });
    setSelectedSlot(null);
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setCustomerSearchTerm("");
  };

  const getBookingPosition = (booking: BookingWithDetails) => {
    const [startHour, startMinute] = booking.startTime.split(":").map(Number);
    const [endHour, endMinute] = booking.endTime.split(":").map(Number);

    // Calculate position based on minutes since start hour using fixed SLOT_HEIGHT
    const startMinutesSince6AM = (startHour - START_HOUR) * 60 + startMinute;
    const endMinutesSince6AM = (endHour - START_HOUR) * 60 + endMinute;

    // Each 15-minute slot = SLOT_HEIGHT pixels
    const top = (startMinutesSince6AM / 15) * SLOT_HEIGHT;
    const height = ((endMinutesSince6AM - startMinutesSince6AM) / 15) * SLOT_HEIGHT;

    if (startMinutesSince6AM < 0) return null;

    return {
      top,
      height: Math.max(height, SLOT_HEIGHT), // Minimum 1 slot height
    };
  };

  const getCurrentTimePosition = () => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Check if current time is within calendar range (6 AM to 10 PM)
    if (hours < START_HOUR || hours > END_HOUR) return null;

    // Calculate exact position using fixed SLOT_HEIGHT
    const minutesSince6AM = (hours - START_HOUR) * 60 + minutes;
    const position = (minutesSince6AM / 15) * SLOT_HEIGHT;

    return position;
  };

  const getBookingColor = (booking: BookingWithDetails) => {
    // Color by type first, then by status
    switch (booking.type) {
      case "maintenance":
        return "text-white";
      case "class":
        return "text-white";
      case "event":
        return "text-white";
      case "regular":
      case "lesson":
      case "tournament":
      default:
        switch (booking.status) {
          case "confirmed":
            return "bg-blue-500 text-white";
          case "pending":
            return "bg-orange-400 text-white";
          case "cancelled":
            return "bg-gray-400 text-white";
          default:
            return "bg-brand-primary text-white";
        }
    }
  };

  const getBookingTypeColor = (type: string) => {
    switch (type) {
      case "maintenance":
        return "#6b7280"; // Gray
      case "class":
        return "#9FC490"; // Light green
      case "event":
        return "#F79824"; // Orange
      default:
        return "#3b82f6"; // Blue
    }
  };

  const getBookingBackgroundStyle = (booking: BookingWithDetails) => {
    switch (booking.type) {
      case "maintenance":
        return { backgroundColor: "#6b7280" };
      case "class":
        return { backgroundColor: "#9FC490" };
      case "event":
        return { backgroundColor: "#F79824" };
      default:
        return {};
    }
  };

  if (!canManage) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const currentTimePosition = getCurrentTimePosition();

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Court Calendar</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-lg font-medium">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Confirmed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-400 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span>Cancelled</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid - Scrollable Container */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden" ref={calendarRef}>
          {/* Fixed Court Headers Row */}
          <div className="flex border-b bg-gray-50 flex-shrink-0">
            <div className="w-16 flex-shrink-0 border-r"></div>
            {courts.map((court) => (
              <div key={court.id} className="flex-1 border-r h-12 flex items-center justify-center min-w-[120px]">
                <div className="text-center">
                  <div className="font-medium text-sm">{court.name}</div>
                  <div className="text-xs text-gray-500">
                    ${court.hourlyRate}/hr
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable Grid Area */}
          <div className="flex-1 overflow-y-auto overflow-x-auto">
            <div className="flex" style={{ height: `${totalGridHeight}px`, minHeight: `${totalGridHeight}px` }}>
              {/* Sticky Time Column */}
              <div className="w-16 flex-shrink-0 border-r bg-gray-50 sticky left-0 z-10">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.time}
                    className="relative border-b border-gray-100"
                    style={{ height: `${SLOT_HEIGHT}px` }}
                  >
                    {slot.minute === 0 && (
                      <span className="absolute -top-2 left-1 text-xs text-gray-600 bg-gray-50 pr-1">
                        {slot.display.replace(":00", "")}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Courts Columns */}
              <div className="flex-1 flex relative">
                {courts.map((court) => (
                  <div key={court.id} className="flex-1 border-r relative min-w-[120px]">
                    {/* Time Slots Grid */}
                    <div className="relative" style={{ height: `${totalGridHeight}px` }}>
                      {timeSlots.map((slot, index) => {
                        const isSelected =
                          isDragging &&
                          dragStart?.court.id === court.id &&
                          dragEnd?.court.id === court.id;

                        const startIndex = isSelected
                          ? timeSlots.findIndex(
                              (s) => s.time === dragStart?.time.time,
                            )
                          : -1;
                        const endIndex = isSelected
                          ? timeSlots.findIndex(
                              (s) => s.time === dragEnd?.time.time,
                            )
                          : -1;
                        const slotIndex = index;

                        const isInRange =
                          isSelected &&
                          slotIndex >= Math.min(startIndex, endIndex) &&
                          slotIndex <= Math.max(startIndex, endIndex);

                        // Show stronger border on hour marks
                        const isHourMark = slot.minute === 0;

                        return (
                          <div
                            key={slot.time}
                            className={`border-b hover:bg-blue-50 cursor-pointer transition-colors ${
                              isInRange ? "bg-blue-100" : ""
                            } ${isHourMark ? "border-gray-300" : "border-gray-100"}`}
                            style={{ height: `${SLOT_HEIGHT}px` }}
                            onClick={(e) =>
                              !isDragging && handleTimeSlotClick(court, slot, e)
                            }
                            onMouseDown={() => handleMouseDown(court, slot)}
                            onMouseEnter={() => handleMouseEnter(court, slot)}
                            onMouseUp={handleMouseUp}
                          />
                        );
                      })}

                  {/* Bookings */}
                  {dayBookings
                    .filter((booking) => booking.courtId === court.id)
                    .map((booking) => {
                      const position = getBookingPosition(booking);
                      if (!position) return null;

                      return (
                        <div
                          key={booking.id}
                          className={`absolute left-1 right-1 rounded px-2 py-1 ${getBookingColor(booking)} shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 hover:z-20`}
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height - 4}px`,
                            ...getBookingBackgroundStyle(booking),
                          }}
                          onMouseEnter={() => setHoveredBooking(booking)}
                          onMouseLeave={() => setHoveredBooking(null)}
                          onDoubleClick={() => {
                            setEditingBooking(booking);
                            setEditFormData({
                              courtId: booking.courtId,
                              date: booking.date,
                              startTime: booking.startTime,
                              endTime: booking.endTime,
                              status: booking.status,
                              notes: booking.notes || "",
                              bookingType: booking.type || "regular",
                              endDate: "",
                              description: booking.description || "",
                              recurringDays: booking.recurringDays || [],
                              recurringEndDate: booking.recurringEndDate || "",
                            });
                          }}
                          title={`${booking.user?.firstName} ${booking.user?.lastName} - ${booking.startTime} to ${booking.endTime}`}
                        >
                          <div className="text-xs font-medium truncate">
                            {booking.type === "class" ? (
                              booking.description || "Class"
                            ) : booking.type === "event" ? (
                              <>Event: {booking.description || "Event"}</>
                            ) : booking.type === "maintenance" ? (
                              <>Maintenance</>
                            ) : (
                              <>
                                {booking.user?.firstName}{" "}
                                {booking.user?.lastName}
                              </>
                            )}
                          </div>
                          <div className="text-xs opacity-90">
                            {(() => {
                              const formatTime = (time: string) => {
                                const [hours, minutes] = time
                                  .split(":")
                                  .map(Number);
                                const period = hours >= 12 ? "PM" : "AM";
                                const displayHours =
                                  hours === 0
                                    ? 12
                                    : hours > 12
                                      ? hours - 12
                                      : hours;
                                return `${displayHours}:${minutes.toString().padStart(2, "0")}${period}`;
                              };
                              return `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`;
                            })()}
                          </div>
                          {(booking.type === "event" ||
                            booking.type === "maintenance") &&
                            booking.description && (
                              <div className="text-xs opacity-75 truncate">
                                {booking.description}
                              </div>
                            )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}

            {/* Current Time Line */}
            {currentTimePosition !== null && isToday(selectedDate) && (
              <div
                className="absolute left-0 right-0 border-t-2 border-orange-500 pointer-events-none z-10"
                style={{ top: `${currentTimePosition}px` }}
              >
                <div className="absolute -left-16 -top-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded">
                  {format(currentTime, "h:mm a")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* Right Sidebar - Date Picker */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Select Date</h2>
        </div>
        <div className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
          />
        </div>

        {/* Quick Stats */}
        <div className="p-4 border-t flex-1">
          <h3 className="font-medium mb-3">Today's Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Bookings:</span>
              <span className="font-medium">{dayBookings.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Courts Available:</span>
              <span className="font-medium">{courts.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-medium">
                $
                {dayBookings
                  .reduce((sum, b) => sum + parseFloat(b.totalAmount || "0"), 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Popover */}
      {popoverOpen && selectedSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end pr-8"
          onClick={() => setPopoverOpen(false)}
        >
          <div
            className="bg-gradient-to-br from-blue-50 to-teal-50 border-l-4 border-l-blue-500 rounded-lg shadow-xl border p-4 w-96 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">New Reservation</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPopoverOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Booking Type Selection */}
              <div className="bg-white p-3 rounded border">
                <Label className="text-xs font-medium text-gray-700 block mb-2">
                  Booking Type
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant={
                      formData.bookingType === "regular" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setFormData({ ...formData, bookingType: "regular" })
                    }
                    className={`text-xs ${formData.bookingType === "regular" ? "bg-blue-500 hover:bg-blue-600" : "border-blue-300 text-blue-600 hover:bg-blue-50"}`}
                    style={{
                      backgroundColor:
                        formData.bookingType === "regular" ? "#3b82f6" : "",
                    }}
                  >
                    Regular
                  </Button>
                  <Button
                    type="button"
                    variant={
                      formData.bookingType === "class" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setFormData({ ...formData, bookingType: "class" })
                    }
                    className={`text-xs ${formData.bookingType === "class" ? "text-white" : "text-green-600 hover:bg-green-50"}`}
                    style={{
                      backgroundColor:
                        formData.bookingType === "class" ? "#9FC490" : "",
                      borderColor:
                        formData.bookingType !== "class" ? "#9FC490" : "",
                    }}
                  >
                    Class
                  </Button>
                  <Button
                    type="button"
                    variant={
                      formData.bookingType === "event" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setFormData({ ...formData, bookingType: "event" })
                    }
                    className={`text-xs ${formData.bookingType === "event" ? "text-white" : "text-orange-600 hover:bg-orange-50"}`}
                    style={{
                      backgroundColor:
                        formData.bookingType === "event" ? "#F79824" : "",
                      borderColor:
                        formData.bookingType !== "event" ? "#F79824" : "",
                    }}
                  >
                    Event
                  </Button>
                  <Button
                    type="button"
                    variant={
                      formData.bookingType === "maintenance"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setFormData({ ...formData, bookingType: "maintenance" })
                    }
                    className={`text-xs ${formData.bookingType === "maintenance" ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                    style={{
                      backgroundColor:
                        formData.bookingType === "maintenance" ? "#6b7280" : "",
                      borderColor:
                        formData.bookingType !== "maintenance" ? "#6b7280" : "",
                    }}
                  >
                    Maintenance
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-blue-700">
                    Court
                  </Label>
                  <Input
                    value={selectedSlot.court.name}
                    disabled
                    className="h-8 text-sm bg-blue-100 border-blue-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-blue-700">
                    Date
                  </Label>
                  <Input
                    value={format(selectedDate, "MM/dd/yyyy")}
                    disabled
                    className="h-8 text-sm bg-blue-100 border-blue-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    value={selectedSlot.time.display}
                    disabled
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Duration (hours)</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) =>
                      setFormData({ ...formData, duration: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">30 min</SelectItem>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="1.5">1.5 hours</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Customer Selection */}
              {/* Customer Section - Only for regular bookings and events */}
              {(formData.bookingType === "regular" ||
                formData.bookingType === "event") && (
                <div className="bg-white p-3 rounded border border-teal-200">
                  <Label className="text-xs font-medium text-teal-700">
                    Customer Information
                  </Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        placeholder="Search existing customer"
                        className="h-8 text-sm border-teal-300 focus:border-teal-500 focus:ring-teal-200"
                        data-testid="input-customer-search"
                      />
                      {customerSearchTerm &&
                        filteredCustomers.length > 0 &&
                        !isNewCustomer && (
                          <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 max-h-32 overflow-y-auto">
                            {filteredCustomers.slice(0, 5).map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-xs"
                                onClick={() => handleCustomerSelect(customer)}
                                data-testid={`button-select-customer-${customer.id}`}
                              >
                                <div className="font-medium">
                                  {customer.firstName} {customer.lastName}
                                </div>
                                <div className="text-gray-500">
                                  {customer.email}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                      {!selectedCustomer && (
                        <Button
                          type="button"
                          variant={isNewCustomer ? "default" : "outline"}
                          size="sm"
                          onClick={handleNewCustomer}
                          className="text-xs"
                          data-testid="button-new-customer"
                        >
                          New Customer
                        </Button>
                      )}
                      {selectedCustomer && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCustomerSearchTerm("");
                            setIsNewCustomer(false);
                          }}
                          className="text-xs"
                          data-testid="button-clear-customer"
                        >
                          Clear Selection
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Details - Only show for regular bookings and events */}
              {(formData.bookingType === "regular" ||
                formData.bookingType === "event") &&
                (isNewCustomer || Boolean(selectedCustomer)) && (
                  <>
                    <div>
                      <Label className="text-xs">Customer Name</Label>
                      <Input
                        value={formData.customerName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customerName: e.target.value,
                          })
                        }
                        placeholder="John Doe"
                        className="h-8 text-sm"
                        disabled={!isNewCustomer && Boolean(selectedCustomer)}
                        required
                        data-testid="input-customer-name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          value={formData.customerEmail}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customerEmail: e.target.value,
                            })
                          }
                          placeholder="john@example.com"
                          className="h-8 text-sm"
                          disabled={!isNewCustomer && Boolean(selectedCustomer)}
                          required
                          data-testid="input-customer-email"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Phone</Label>
                        <Input
                          value={formData.customerPhone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customerPhone: e.target.value,
                            })
                          }
                          placeholder="(555) 123-4567"
                          className="h-8 text-sm"
                          disabled={!isNewCustomer && Boolean(selectedCustomer)}
                          data-testid="input-customer-phone"
                        />
                      </div>
                    </div>

                    {isNewCustomer && (
                      <div>
                        <Label className="text-xs">Customer Type</Label>
                        <Select
                          value={formData.customerType}
                          onValueChange={(value) =>
                            setFormData({ ...formData, customerType: value })
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-sm"
                            data-testid="select-customer-type"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="guest">Guest</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

              {/* Event-specific fields */}
              {formData.bookingType === "event" && (
                <div className="bg-orange-50 p-3 rounded border border-orange-200 space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-orange-700">
                      Name of Event *
                    </Label>
                    <Input
                      value={formData.description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="e.g., Summer Tournament, Corporate Team Building"
                      className="h-8 text-sm mt-1"
                      required
                      data-testid="input-event-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-orange-700">
                      Event Description
                    </Label>
                    <Input
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Additional details about the event..."
                      className="h-8 text-sm mt-1"
                      data-testid="input-event-description"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-orange-700">
                      Duration (hours)
                    </Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) =>
                        setFormData({ ...formData, duration: value })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="1.5">1.5 hours</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="2.5">2.5 hours</SelectItem>
                        <SelectItem value="3">3 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="5">5 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="8">Full day (8 hours)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Class-specific fields */}
              {formData.bookingType === "class" && (
                <div className="bg-green-50 p-3 rounded border border-green-200 space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-green-700">
                      Class Name *
                    </Label>
                    <Input
                      value={formData.description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="e.g., Beginner Tennis, Advanced Pickleball"
                      className="h-8 text-sm mt-1"
                      required
                      data-testid="input-class-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-green-700">
                      Recurring Days
                    </Label>
                    <div className="grid grid-cols-7 gap-1 mt-1">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                        (day) => (
                          <label
                            key={day}
                            className="flex items-center justify-center"
                          >
                            <input
                              type="checkbox"
                              checked={
                                formData.recurringDays?.includes(day) || false
                              }
                              onChange={(e) => {
                                const days = formData.recurringDays || [];
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    recurringDays: [...days, day],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    recurringDays: days.filter(
                                      (d) => d !== day,
                                    ),
                                  });
                                }
                              }}
                              className="sr-only"
                            />
                            <span
                              className={`text-xs px-2 py-1 rounded cursor-pointer ${
                                formData.recurringDays?.includes(day)
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                              }`}
                            >
                              {day}
                            </span>
                          </label>
                        ),
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-green-700">
                      End Date (Recurring Until)
                    </Label>
                    <Input
                      type="date"
                      value={formData.recurringEndDate || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurringEndDate: e.target.value,
                        })
                      }
                      className="h-8 text-sm mt-1"
                      min={format(selectedDate, "yyyy-MM-dd")}
                      data-testid="input-recurring-end"
                    />
                  </div>
                </div>
              )}

              {/* Maintenance-specific fields */}
              {formData.bookingType === "maintenance" && (
                <div className="bg-gray-50 p-3 rounded border border-gray-400 space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">
                      Maintenance Type *
                    </Label>
                    <Input
                      value={formData.description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="e.g., Court Resurfacing, Net Replacement"
                      className="h-8 text-sm mt-1"
                      required
                      data-testid="input-maintenance-type"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700">
                      Description
                    </Label>
                    <Input
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Details about the maintenance work..."
                      className="h-8 text-sm mt-1"
                      data-testid="input-maintenance-description"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700">
                      Duration (hours)
                    </Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) =>
                        setFormData({ ...formData, duration: value })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">30 minutes</SelectItem>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="3">3 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="8">Full day (8 hours)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Payment section - only for regular bookings */}
              {formData.bookingType === "regular" && (
                <div className="bg-white p-3 rounded border border-orange-200">
                  <Label className="text-xs font-medium text-orange-700">
                    Payment Method *
                  </Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm border-orange-300 focus:border-orange-500 focus:ring-orange-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* General notes - only for regular bookings */}
              {formData.bookingType === "regular" && (
                <div>
                  <Label className="text-xs font-medium text-gray-700">
                    Notes
                  </Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Special requests..."
                    className="h-8 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                    data-testid="input-notes"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                {formData.bookingType === "regular" && (
                  <div className="text-sm">
                    <span className="text-gray-600">Total: </span>
                    <span className="font-semibold">${calculateTotal()}</span>
                  </div>
                )}
                {formData.bookingType === "class" && (
                  <div className="text-sm text-green-600 font-medium">
                    Class Booking - FREE
                  </div>
                )}
                {formData.bookingType === "event" && (
                  <div className="text-sm text-orange-600 font-medium">
                    Event Booking - FREE
                  </div>
                )}
                {formData.bookingType === "maintenance" && (
                  <div className="text-sm text-gray-600 font-medium">
                    Maintenance Block - No Charge
                  </div>
                )}
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPopoverOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      createBookingMutation.isPending ||
                      ((formData.bookingType === "regular" ||
                        formData.bookingType === "event") &&
                        !isNewCustomer &&
                        !selectedCustomer)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-save-booking"
                  >
                    {createBookingMutation.isPending
                      ? "Saving..."
                      : "Save Booking"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-lg">Edit Reservation</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingBooking(null)}
                data-testid="button-close-edit-modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4">
              <div className="space-y-4">
                {/* Show booking type */}
                <div>
                  <Label className="text-sm font-medium">Booking Type</Label>
                  <Select
                    value={editFormData.bookingType}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, bookingType: value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="class">Class</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer info - only for regular bookings */}
                {editFormData.bookingType === "regular" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium">Customer</Label>
                      <Input
                        value={`${editingBooking.user?.firstName} ${editingBooking.user?.lastName}`}
                        disabled
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <Input
                        value={editingBooking.user?.email || ""}
                        disabled
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                {/* Class-specific fields */}
                {editFormData.bookingType === "class" && (
                  <div className="bg-green-50 p-3 rounded border border-green-200 space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-green-700">
                        Class Name
                      </Label>
                      <Input
                        value={editFormData.description || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            description: e.target.value,
                          })
                        }
                        placeholder="e.g., Beginner Tennis"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Event-specific fields */}
                {editFormData.bookingType === "event" && (
                  <div className="bg-orange-50 p-3 rounded border border-orange-200 space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-orange-700">
                        Event Name
                      </Label>
                      <Input
                        value={editFormData.description || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            description: e.target.value,
                          })
                        }
                        placeholder="e.g., Summer Tournament"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Maintenance-specific fields */}
                {editFormData.bookingType === "maintenance" && (
                  <div className="bg-gray-50 p-3 rounded border border-gray-400 space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-700">
                        Maintenance Type
                      </Label>
                      <Input
                        value={editFormData.description || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            description: e.target.value,
                          })
                        }
                        placeholder="e.g., Court Resurfacing"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Court</Label>
                    <Select
                      value={editFormData.courtId}
                      onValueChange={(value) =>
                        setEditFormData({ ...editFormData, courtId: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {courts.map((court) => (
                          <SelectItem key={court.id} value={court.id}>
                            {court.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date</Label>
                    <Input
                      value={editFormData.date}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          date: e.target.value,
                        })
                      }
                      className="h-9"
                      type="date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Start Time</Label>
                    <TimePicker
                      value={editFormData.startTime}
                      onChange={(time) =>
                        setEditFormData({ ...editFormData, startTime: time })
                      }
                      className="h-9 w-full"
                      minuteIncrement={15}
                      placeholder="Select start time"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">End Time</Label>
                    <TimePicker
                      value={editFormData.endTime}
                      onChange={(time) =>
                        setEditFormData({ ...editFormData, endTime: time })
                      }
                      className="h-9 w-full"
                      minuteIncrement={15}
                      placeholder="Select end time"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, status: value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <Input
                    value={editFormData.notes}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        notes: e.target.value,
                      })
                    }
                    className="h-9"
                    placeholder="Special requests..."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingBooking(null)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this reservation?",
                    )
                  ) {
                    deleteBookingMutation.mutate(editingBooking!.id);
                  }
                }}
                disabled={deleteBookingMutation.isPending}
                data-testid="button-delete-booking"
              >
                {deleteBookingMutation.isPending
                  ? "Deleting..."
                  : "Delete Reservation"}
              </Button>
              <Button
                onClick={() => {
                  updateBookingMutation.mutate({
                    id: editingBooking!.id,
                    updates: {
                      ...editFormData,
                      type: editFormData.bookingType,
                    },
                  });
                }}
                disabled={updateBookingMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateBookingMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredBooking && (
        <div className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded shadow-lg pointer-events-none text-sm">
          <div className="font-medium">
            {hoveredBooking.user?.firstName} {hoveredBooking.user?.lastName}
          </div>
          <div className="text-gray-300">
            {hoveredBooking.startTime} - {hoveredBooking.endTime}
          </div>
          <div className="text-gray-400 capitalize">
            {hoveredBooking.status}
          </div>
        </div>
      )}
    </div>
  );
}
