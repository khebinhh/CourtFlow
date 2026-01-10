import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, MapPin, User, DollarSign, Edit, Trash2, Plus, Filter } from "lucide-react";
import type { BookingWithDetails } from "@shared/schema";

export default function Bookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBooking, setEditingBooking] = useState<BookingWithDetails | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: user?.role === "admin" || user?.role === "staff" 
      ? ["/api/bookings"] 
      : ["/api/bookings", { userId: user?.id }],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return await apiRequest(`/api/bookings/${id}`, "PUT", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      toast({
        title: "Booking Updated",
        description: "Booking has been updated successfully.",
      });
      setIsEditModalOpen(false);
      setEditingBooking(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/bookings/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      toast({
        title: "Booking Cancelled",
        description: "Booking has been cancelled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getBookingTypeColor = (type: string) => {
    switch (type) {
      case 'maintenance': return '#6b7280'; // Gray
      case 'class': return '#9FC490'; // Light green  
      case 'event': return '#F79824'; // Orange
      default: return '#3b82f6'; // Blue
    }
  };

  const filteredBookings = (bookings as BookingWithDetails[] || [])?.filter(booking => {
    const statusMatch = filterStatus === "all" || booking.status === filterStatus;
    const dateMatch = !filterDate || booking.date === filterDate;
    const searchMatch = !searchTerm || 
      booking.court.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && dateMatch && searchMatch;
  }) || [];

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800",
    };
    
    return (
      <Badge className={styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      regular: "bg-blue-100 text-blue-800",
      class: "bg-green-100 text-green-800",
      event: "bg-orange-100 text-orange-800",
      maintenance: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge variant="outline" className={styles[type as keyof typeof styles] || "bg-gray-100 text-gray-800"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  const handleEdit = (booking: BookingWithDetails) => {
    setEditingBooking(booking);
    setIsEditModalOpen(true);
  };

  const handleDelete = (booking: BookingWithDetails) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      deleteBookingMutation.mutate(booking.id);
    }
  };

  const handleUpdateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const updates = {
      status: formData.get("status"),
      notes: formData.get("notes"),
    };

    updateBookingMutation.mutate({ id: editingBooking.id, updates });
  };

  const canManage = user?.role === "admin" || user?.role === "staff";

  const bookingStats = {
    total: bookings?.length || 0,
    pending: bookings?.filter(b => b.status === "pending").length || 0,
    confirmed: bookings?.filter(b => b.status === "confirmed").length || 0,
    today: bookings?.filter(b => b.date === new Date().toISOString().split('T')[0]).length || 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {canManage ? "Booking Management" : "My Bookings"}
          </h1>
          <p className="text-gray-600 mt-2">
            {canManage 
              ? "Manage all court reservations and bookings"
              : "View and manage your court reservations"
            }
          </p>
        </div>
      </div>

      {/* Booking Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{bookingStats.total}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{bookingStats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{bookingStats.confirmed}</div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{bookingStats.today}</div>
            <div className="text-sm text-gray-600">Today</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-gray-100 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              data-testid="filter-date"
            />
          </div>
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Search by court, user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="border border-gray-100">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600">
              {bookings?.length === 0 
                ? "No bookings have been made yet."
                : "No bookings match your current filters."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="border border-gray-100 hover:shadow-md transition-shadow" data-testid={`booking-${booking.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{booking.court.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {booking.court.surfaceType}
                        </Badge>
                      </div>
                      {getTypeBadge(booking.type)}
                      {getStatusBadge(booking.status)}
                    </div>
                    
                    {/* Display booking type specific information */}
                    {booking.type === 'class' && booking.description && (
                      <div className="font-medium text-green-700">
                        Class: {booking.description}
                      </div>
                    )}
                    {booking.type === 'event' && booking.description && (
                      <div className="font-medium text-orange-700">
                        Event: {booking.description}
                      </div>
                    )}
                    {booking.type === 'maintenance' && booking.description && (
                      <div className="font-medium text-gray-700">
                        Maintenance: {booking.description}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </span>
                      </div>
                      {booking.type === 'regular' && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4" />
                          <span>${booking.totalAmount}</span>
                          {booking.isPaid && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Paid</Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {canManage && booking.type === 'regular' && (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {booking.user.firstName} {booking.user.lastName} ({booking.user.email})
                        </span>
                        <Badge className="text-xs">
                          {booking.user.role}
                        </Badge>
                      </div>
                    )}

                    {booking.notes && (
                      <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                        <strong>Notes:</strong> {booking.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {(canManage || booking.userId === user?.id) && booking.status !== "cancelled" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(booking)}
                          data-testid={`button-edit-${booking.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(booking)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-cancel-${booking.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Booking Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent data-testid="modal-edit-booking">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBooking} className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={editingBooking?.status}>
                <SelectTrigger data-testid="edit-booking-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                name="notes"
                defaultValue={editingBooking?.notes || ""}
                placeholder="Add any notes about this booking..."
                data-testid="edit-booking-notes"
              />
            </div>
            <div className="flex space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => setIsEditModalOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-tennis-green hover:bg-tennis-green/90"
                disabled={updateBookingMutation.isPending}
                data-testid="button-save-booking"
              >
                {updateBookingMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
