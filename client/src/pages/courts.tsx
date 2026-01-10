import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CourtCard from "@/components/court/court-card";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Filter } from "lucide-react";

export default function Courts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterSurface, setFilterSurface] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: courts, isLoading } = useQuery({
    queryKey: ["/api/courts"],
  });

  const [newCourt, setNewCourt] = useState({
    name: "",
    surfaceType: "hard" as "hard" | "clay" | "grass",
    hourlyRate: "",
    peakHourlyRate: "",
    openTime: "06:00",
    closeTime: "23:00",
    description: "",
    status: "active" as "active" | "maintenance" | "inactive",
  });

  const createCourtMutation = useMutation({
    mutationFn: async (courtData: any) => {
      const response = await apiRequest("POST", "/api/courts", courtData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Court Created",
        description: "New court has been added successfully.",
      });
      setIsAddModalOpen(false);
      setNewCourt({
        name: "",
        surfaceType: "hard",
        hourlyRate: "",
        peakHourlyRate: "",
        openTime: "06:00",
        closeTime: "23:00",
        description: "",
        status: "active",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create court. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCourt = (e: React.FormEvent) => {
    e.preventDefault();
    createCourtMutation.mutate(newCourt);
  };

  const canManage = user?.role === "admin" || user?.role === "staff";

  const filteredCourts = courts?.filter(court => {
    const surfaceMatch = filterSurface === "all" || court.surfaceType === filterSurface;
    const statusMatch = filterStatus === "all" || court.status === filterStatus;
    return surfaceMatch && statusMatch;
  }) || [];

  const courtStats = {
    total: courts?.length || 0,
    active: courts?.filter(c => c.status === "active").length || 0,
    maintenance: courts?.filter(c => c.status === "maintenance").length || 0,
    hard: courts?.filter(c => c.surfaceType === "hard").length || 0,
    clay: courts?.filter(c => c.surfaceType === "clay").length || 0,
    grass: courts?.filter(c => c.surfaceType === "grass").length || 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Court Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your tennis courts and their availability
          </p>
        </div>
        {canManage && (
          <Button 
            className="bg-tennis-green hover:bg-tennis-green/90"
            onClick={() => setIsAddModalOpen(true)}
            data-testid="button-add-court"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Court
          </Button>
        )}
      </div>

      {/* Court Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{courtStats.total}</div>
            <div className="text-sm text-gray-600">Total Courts</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{courtStats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{courtStats.maintenance}</div>
            <div className="text-sm text-gray-600">Maintenance</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{courtStats.hard}</div>
            <div className="text-sm text-gray-600">Hard Courts</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{courtStats.clay}</div>
            <div className="text-sm text-gray-600">Clay Courts</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{courtStats.grass}</div>
            <div className="text-sm text-gray-600">Grass Courts</div>
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
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Surface Type</Label>
            <Select value={filterSurface} onValueChange={setFilterSurface}>
              <SelectTrigger className="w-40" data-testid="filter-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Surfaces</SelectItem>
                <SelectItem value="hard">Hard Court</SelectItem>
                <SelectItem value="clay">Clay Court</SelectItem>
                <SelectItem value="grass">Grass Court</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40" data-testid="filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Courts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border border-gray-100">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourts.map((court) => (
            <CourtCard key={court.id} court={court} canManage={canManage} />
          ))}
        </div>
      )}

      {filteredCourts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No courts found matching your filters.</p>
        </div>
      )}

      {/* Add Court Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="modal-add-court">
          <DialogHeader>
            <DialogTitle>Add New Court</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCourt} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Court Name</Label>
                <Input
                  id="name"
                  value={newCourt.name}
                  onChange={(e) => setNewCourt(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Court 1"
                  required
                  data-testid="input-court-name"
                />
              </div>
              <div>
                <Label htmlFor="surfaceType">Surface Type</Label>
                <Select value={newCourt.surfaceType} onValueChange={(value: any) => 
                  setNewCourt(prev => ({ ...prev, surfaceType: value }))
                }>
                  <SelectTrigger data-testid="select-surface-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hard">Hard Court</SelectItem>
                    <SelectItem value="clay">Clay Court</SelectItem>
                    <SelectItem value="grass">Grass Court</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourlyRate">Regular Rate ($/hour)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={newCourt.hourlyRate}
                  onChange={(e) => setNewCourt(prev => ({ ...prev, hourlyRate: e.target.value }))}
                  placeholder="25.00"
                  required
                  data-testid="input-hourly-rate"
                />
              </div>
              <div>
                <Label htmlFor="peakHourlyRate">Peak Rate ($/hour)</Label>
                <Input
                  id="peakHourlyRate"
                  type="number"
                  step="0.01"
                  value={newCourt.peakHourlyRate}
                  onChange={(e) => setNewCourt(prev => ({ ...prev, peakHourlyRate: e.target.value }))}
                  placeholder="35.00"
                  required
                  data-testid="input-peak-rate"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="openTime">Open Time</Label>
                <Input
                  id="openTime"
                  type="time"
                  value={newCourt.openTime}
                  onChange={(e) => setNewCourt(prev => ({ ...prev, openTime: e.target.value }))}
                  data-testid="input-open-time"
                />
              </div>
              <div>
                <Label htmlFor="closeTime">Close Time</Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={newCourt.closeTime}
                  onChange={(e) => setNewCourt(prev => ({ ...prev, closeTime: e.target.value }))}
                  data-testid="input-close-time"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newCourt.description}
                onChange={(e) => setNewCourt(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Professional hard court with excellent lighting"
                data-testid="input-description"
              />
            </div>

            <div className="flex space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => setIsAddModalOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-tennis-green hover:bg-tennis-green/90"
                disabled={createCourtMutation.isPending}
                data-testid="button-create-court"
              >
                {createCourtMutation.isPending ? "Creating..." : "Create Court"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
