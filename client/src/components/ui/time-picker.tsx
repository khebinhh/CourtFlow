import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
  minuteIncrement?: 15 | 30; // Support 15 or 30 minute increments
}

export function TimePicker({ 
  value, 
  onChange, 
  className,
  placeholder = "Select time",
  minuteIncrement = 15
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  // Parse the value when it changes
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      
      setSelectedHour(displayHour);
      setSelectedMinute(minutes);
      setSelectedPeriod(period);
    }
  }, [value]);

  const handleTimeSelect = () => {
    let hour24 = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange(timeString);
    setIsOpen(false);
  };

  const formatDisplayTime = () => {
    if (!value) return placeholder;
    
    const [hours, minutes] = value.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const minuteOptions = minuteIncrement === 15 
    ? [0, 15, 30, 45]
    : [0, 30];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn("justify-between", className)}
        >
          <span>{formatDisplayTime()}</span>
          <Clock className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium">Select Time</div>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Hour Selection with Scroll */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hour</label>
              <div className="h-32 overflow-y-auto border rounded p-2">
                {[...Array(12)].map((_, i) => {
                  const hour = i + 1;
                  return (
                    <button
                      key={hour}
                      onClick={() => setSelectedHour(hour)}
                      className={cn(
                        "w-full text-sm p-2 rounded hover:bg-gray-100 text-left",
                        selectedHour === hour && "bg-blue-500 text-white hover:bg-blue-600"
                      )}
                    >
                      {hour}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute Selection with Scroll */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Minute</label>
              <div className="h-32 overflow-y-auto border rounded p-2">
                {minuteOptions.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => setSelectedMinute(minute)}
                    className={cn(
                      "w-full text-sm p-2 rounded hover:bg-gray-100 text-left",
                      selectedMinute === minute && "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                  >
                    {minute.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM Selection */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Period</label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedPeriod('AM')}
                  className={cn(
                    "w-full text-sm p-2 rounded hover:bg-gray-100",
                    selectedPeriod === 'AM' && "bg-blue-500 text-white hover:bg-blue-600"
                  )}
                >
                  AM
                </button>
                <button
                  onClick={() => setSelectedPeriod('PM')}
                  className={cn(
                    "w-full text-sm p-2 rounded hover:bg-gray-100",
                    selectedPeriod === 'PM' && "bg-blue-500 text-white hover:bg-blue-600"
                  )}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleTimeSelect}>
              Set Time
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}