import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, FileText } from "lucide-react";

export default function Charts() {
  const { data: stats } = useQuery({
    queryKey: ["/api/analytics/stats"],
  });

  const { data: bookings } = useQuery({
    queryKey: ["/api/bookings"],
  });

  // Generate weekly revenue data from bookings
  const getWeeklyRevenue = () => {
    if (!bookings) return [];
    
    const today = new Date();
    const weekData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRevenue = bookings
        .filter(booking => booking.date === dateStr && booking.isPaid)
        .reduce((sum, booking) => sum + parseFloat(booking.totalAmount), 0);
      
      weekData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: dayRevenue,
      });
    }
    
    return weekData;
  };

  // Generate peak hours data
  const getPeakHours = () => {
    if (!bookings) return [];
    
    const hourCounts: { [key: string]: number } = {};
    const totalSlots = 15; // 8 AM to 11 PM
    
    bookings.forEach(booking => {
      if (booking.status !== "cancelled") {
        const hour = parseInt(booking.startTime.split(':')[0]);
        const hourRange = `${hour}:00 - ${hour + 1}:00`;
        hourCounts[hourRange] = (hourCounts[hourRange] || 0) + 1;
      }
    });
    
    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour,
        percentage: Math.round((count / totalSlots) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
    
    return peakHours;
  };

  const weeklyRevenue = getWeeklyRevenue();
  const peakHours = getPeakHours();
  const maxRevenue = Math.max(...weeklyRevenue.map(d => d.revenue), 1);

  const handleExportCSV = () => {
    if (!bookings) return;
    
    const csvData = [
      ['Date', 'Court', 'User', 'Type', 'Status', 'Amount', 'Paid'],
      ...bookings.map(booking => [
        booking.date,
        booking.court.name,
        `${booking.user.firstName} ${booking.user.lastName}`,
        booking.type,
        booking.status,
        booking.totalAmount,
        booking.isPaid ? 'Yes' : 'No'
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings-report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    // In a real application, you would use a library like jsPDF
    alert('PDF export functionality would be implemented with a library like jsPDF');
  };

  return (
    <Card className="border border-gray-100" data-testid="card-analytics">
      <CardHeader>
        <CardTitle>Analytics Overview</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Weekly Revenue Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Revenue</h4>
          {weeklyRevenue.length > 0 ? (
            <div className="h-40 bg-gradient-to-r from-tennis-green/10 to-tennis-green/30 rounded-lg flex items-end justify-around p-4" data-testid="chart-weekly-revenue">
              {weeklyRevenue.map((data, index) => (
                <div key={data.day} className="flex flex-col items-center">
                  <div 
                    className="bg-tennis-green w-8 rounded-t transition-all duration-500"
                    style={{ 
                      height: `${Math.max((data.revenue / maxRevenue) * 120, 8)}px` 
                    }}
                    title={`${data.day}: $${data.revenue.toFixed(2)}`}
                    data-testid={`revenue-bar-${index}`}
                  ></div>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            {weeklyRevenue.map((data) => (
              <span key={data.day} data-testid={`revenue-label-${data.day}`}>
                {data.day}
              </span>
            ))}
          </div>
        </div>

        {/* Peak Hours */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Peak Booking Hours</h4>
          {peakHours.length > 0 ? (
            <div className="space-y-3" data-testid="peak-hours-list">
              {peakHours.map((peak, index) => (
                <div key={peak.hour} data-testid={`peak-hour-${index}`}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{peak.hour}</span>
                    <span className="font-medium text-gray-900">{peak.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-tennis-green h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${peak.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Month Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">This Month Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total Bookings</div>
              <div className="text-lg font-semibold text-gray-900" data-testid="monthly-bookings">
                {bookings?.length || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Total Revenue</div>
              <div className="text-lg font-semibold text-tennis-green" data-testid="monthly-revenue">
                ${bookings?.filter(b => b.isPaid).reduce((sum, b) => sum + parseFloat(b.totalAmount), 0).toFixed(2) || "0.00"}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Avg. per Booking</div>
              <div className="text-lg font-semibold text-gray-900" data-testid="avg-booking-value">
                ${bookings?.length ? (bookings.filter(b => b.isPaid).reduce((sum, b) => sum + parseFloat(b.totalAmount), 0) / bookings.length).toFixed(2) : "0.00"}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Cancellation Rate</div>
              <div className="text-lg font-semibold text-gray-900" data-testid="cancellation-rate">
                {bookings?.length ? Math.round((bookings.filter(b => b.status === "cancelled").length / bookings.length) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={handleExportCSV}
              data-testid="button-export-csv"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={handleExportPDF}
              data-testid="button-export-pdf"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
