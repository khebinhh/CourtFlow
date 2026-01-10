import { useAuth } from "@/hooks/use-auth";
import StatsCards from "@/components/analytics/stats-cards";
import CourtCalendar from "@/components/court/court-calendar";
import Charts from "@/components/analytics/charts";
import MemberList from "@/components/members/member-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BarChart3, UserPlus, Calendar as CalendarIcon } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const canManage = user?.role === "admin" || user?.role === "staff";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening at your iTennis/iPickle facility today.
        </p>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <CourtCalendar />
        </div>

        <div className="space-y-6">
          {canManage && (
            <Card className="border border-gray-100" data-testid="card-quick-actions">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full bg-brand-primary hover:bg-brand-primary/90"
                  data-testid="button-add-court"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Court
                </Button>
                <Button 
                  className="w-full bg-brand-secondary hover:bg-brand-secondary/90"
                  data-testid="button-block-time"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Block Time Slot
                </Button>
                <Button 
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 text-black"
                  data-testid="button-view-reports"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
                <Button 
                  className="w-full bg-brand-dark hover:bg-brand-dark/90"
                  data-testid="button-add-member"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </CardContent>
            </Card>
          )}

          <MemberList />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {canManage && <MemberList showFull />}
        <Charts />
      </div>
    </div>
  );
}
