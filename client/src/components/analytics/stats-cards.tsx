import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Calendar, DollarSign, Users, Activity } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/analytics/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-gray-100">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Today's Bookings",
      value: stats?.todayBookings || 0,
      icon: Calendar,
      change: "+12% from yesterday",
      changeType: "positive" as const,
      testId: "stat-today-bookings",
    },
    {
      title: "Revenue Today",
      value: `$${stats?.todayRevenue?.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      change: "+8% from yesterday",
      changeType: "positive" as const,
      testId: "stat-today-revenue",
    },
    {
      title: "Active Courts",
      value: `${stats?.activeCourts || 0}/${stats?.totalCourts || 0}`,
      icon: Activity,
      change: `${(stats?.totalCourts || 0) - (stats?.activeCourts || 0)} courts available`,
      changeType: "neutral" as const,
      testId: "stat-active-courts",
    },
    {
      title: "Members Online",
      value: stats?.onlineMembers || 0,
      icon: Users,
      change: "23 booking now",
      changeType: "positive" as const,
      testId: "stat-online-members",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat) => (
        <Card key={stat.title} className="border border-gray-100" data-testid={stat.testId}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className="p-3 bg-tennis-green/10 rounded-full">
                <stat.icon className="h-6 w-6 text-tennis-green" />
              </div>
            </div>
            <p className={`text-sm mt-2 flex items-center ${
              stat.changeType === "positive" 
                ? "text-green-600" 
                : stat.changeType === "negative"
                ? "text-red-600"
                : "text-gray-600"
            }`}>
              {stat.changeType === "positive" && <TrendingUp className="h-3 w-3 mr-1" />}
              {stat.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
