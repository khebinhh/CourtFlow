import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard } from "lucide-react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourt?: string;
  initialDate?: string;
  initialTime?: string;
  booking?: any;
  courts?: any[];
}

export default function BookingModal({ 
  isOpen, 
  onClose, 
  initialCourt, 
  initialDate, 
  initialTime,
  booking,
  courts: courtsProp
}: BookingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    courtId: initialCourt || "",
    date: initialDate || new Date().toISOString().split('T')[0],
    startTime: initialTime || "",
    duration: "1",
    type: "regular",
    userId: user?.id || "",
    paymentMethod: "credit_card",
  });

  useEffect(() => {
    if (initialCourt) setFormData(prev => ({ ...prev, courtId: initialCourt }));
    if (initialDate) setFormData(prev => ({ ...prev, date: initialDate }));
    if (initialTime) setFormData(prev => ({ ...prev, startTime: initialTime }));
  }, [initialCourt, initialDate, initialTime]);

  const { data: courts } = useQuery({
    queryKey: ["/api/courts"],
    enabled: !courtsProp,
  });

  const courtsData = courtsProp || courts;

  const selectedCourt = courtsData?.find(c => c.id === formData.courtId);

  const calculateTotal = () => {
    if (!selectedCourt) return 0;
    
    const hours = parseFloat(formData.duration);
    const rate = parseFloat(selectedCourt.hourlyRate);
    const subtotal = hours * rate;
    const tax = subtotal * 0.1; // 10% tax
    
    return subtotal + tax;
  };

  const calculateEndTime = () => {
    if (!formData.startTime || !formData.duration) return "";
    
    const [hours, minutes] = formData.startTime.split(':').map(Number);
    const durationHours = parseFloat(formData.duration);
    const endHours = hours + Math.floor(durationHours);
    const endMinutes = minutes + ((durationHours % 1) * 60);
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return await apiRequest("/api/bookings", "POST", bookingData);
    },
    onSuccess: async (booking) => {
      // Create payment
      const paymentData = {
        bookingId: booking.id,
        amount: calculateTotal().toFixed(2),
        method: formData.paymentMethod,
      };
      
      try {
        await apiRequest("/api/payments", "POST", paymentData);
        
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
        
        toast({
          title: "Booking Confirmed",
          description: `Court ${selectedCourt?.name} reserved for ${formData.date} at ${formData.startTime}`,
        });
        
        onClose();
      } catch (error) {
        toast({
          title: "Payment Failed",
          description: "Booking created but payment failed. Please contact support.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.courtId || !formData.date || !formData.startTime || !formData.duration) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const bookingData = {
      courtId: formData.courtId,
      userId: formData.userId,
      date: formData.date,
      startTime: formData.startTime,
      endTime: calculateEndTime(),
      type: formData.type,
      totalAmount: calculateTotal().toFixed(2),
      status: "pending",
    };

    createBookingMutation.mutate(bookingData);
  };

  const total = calculateTotal();
  const subtotal = total / 1.1; // Remove tax to get subtotal
  const tax = total - subtotal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-booking">
        <DialogHeader>
          <DialogTitle>
            New Court Booking
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="court">Select Court</Label>
              <Select value={formData.courtId} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, courtId: value }))
              }>
                <SelectTrigger data-testid="select-court">
                  <SelectValue placeholder="Choose a court" />
                </SelectTrigger>
                <SelectContent>
                  {courtsData?.map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name} - {court.surfaceType} (${court.hourlyRate}/hr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Select Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                data-testid="input-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Select value={formData.startTime} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, startTime: value }))
              }>
                <SelectTrigger data-testid="select-start-time">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }, (_, i) => {
                    const hour = i + 8;
                    const time = `${hour.toString().padStart(2, '0')}:00`;
                    return (
                      <SelectItem key={time} value={time}>
                        {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select value={formData.duration} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, duration: value }))
              }>
                <SelectTrigger data-testid="select-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="1.5">1.5 hours</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Booking Type</Label>
            <RadioGroup 
              value={formData.type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <RadioGroupItem value="regular" id="regular" />
                <Label htmlFor="regular" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Regular Play</p>
                    <p className="text-xs text-gray-500">Standard court booking</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <RadioGroupItem value="lesson" id="lesson" />
                <Label htmlFor="lesson" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Coach Lesson</p>
                    <p className="text-xs text-gray-500">Private coaching session</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <RadioGroupItem value="tournament" id="tournament" />
                <Label htmlFor="tournament" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Tournament</p>
                    <p className="text-xs text-gray-500">Competition event</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-gray-50 rounded-lg p-4" data-testid="payment-summary">
            <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Court fee ({formData.duration} hour{parseFloat(formData.duration) !== 1 ? 's' : ''})
                </span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-semibold text-tennis-green">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { id: "credit_card", icon: "💳", label: "Card" },
                  { id: "apple_pay", icon: "🍎", label: "Apple Pay" },
                  { id: "google_pay", icon: "🟢", label: "Google Pay" },
                  { id: "paypal", icon: "🅿️", label: "PayPal" },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    className={`p-3 border rounded-lg text-center hover:bg-gray-100 transition-colors ${
                      formData.paymentMethod === method.id ? "border-tennis-green bg-tennis-green/5" : ""
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.id }))}
                    data-testid={`payment-${method.id}`}
                  >
                    <div className="text-lg mb-1">{method.icon}</div>
                    <div className="text-xs">{method.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
              data-testid="button-cancel-booking"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-tennis-green hover:bg-tennis-green/90"
              disabled={createBookingMutation.isPending}
              data-testid="button-confirm-booking"
            >
              {createBookingMutation.isPending ? "Processing..." : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
