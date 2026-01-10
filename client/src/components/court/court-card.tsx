import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Edit, Trash2, Clock, DollarSign, Layers } from "lucide-react";
import type { Court } from "@shared/schema";

interface CourtCardProps {
  court: Court;
  canManage: boolean;
}

export default function CourtCard({ court, canManage }: CourtCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: court.name,
    surfaceType: court.surfaceType,
    status: court.status,
    hourlyRate: court.hourlyRate,
    peakHourlyRate: court.peakHourlyRate,
    openTime: court.openTime,
    closeTime: court.closeTime,
    description: court.description || "",
  });

  const updateCourtMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PUT", `/api/courts/${court.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Court Updated",
        description: "Court information has been updated successfully.",
      });
      setIsEditModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update court. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCourtMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/courts/${court.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Court Deleted",
        description: "Court has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete court. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateCourtMutation.mutate(editData);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this court?")) {
      deleteCourtMutation.mutate();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "maintenance":
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSurfaceIcon = (surface: string) => {
    const icons = {
      hard: "🏟️",
      clay: "🧱",
      grass: "🌱",
    };
    return icons[surface as keyof typeof icons] || "🎾";
  };

  return (
    <>
      <Card className="border border-gray-200 hover:shadow-md transition-shadow" data-testid={`court-card-${court.id}`}>
        <div className="relative">
          <img 
            src={court.imageUrl || "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200"}
            alt={`${court.name} - ${court.surfaceType} court`}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          <div className="absolute top-4 right-4">
            {getStatusBadge(court.status)}
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{court.name}</h3>
            <span className="text-2xl">{getSurfaceIcon(court.surfaceType)}</span>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex items-center">
              <Layers className="h-4 w-4 mr-2" />
              <span className="capitalize">{court.surfaceType} Court</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              <span>{court.openTime} - {court.closeTime}</span>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              <span>${court.hourlyRate}/hr (Peak: ${court.peakHourlyRate}/hr)</span>
            </div>
          </div>
          
          {court.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {court.description}
            </p>
          )}
          
          {canManage && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="text-tennis-green hover:text-tennis-green/80"
                data-testid={`button-edit-${court.id}`}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
                disabled={deleteCourtMutation.isPending}
                data-testid={`button-delete-${court.id}`}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleteCourtMutation.isPending ? "..." : "Delete"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl" data-testid={`modal-edit-${court.id}`}>
          <DialogHeader>
            <DialogTitle>Edit {court.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editName">Court Name</Label>
                <Input
                  id="editName"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  data-testid="edit-court-name"
                />
              </div>
              <div>
                <Label htmlFor="editSurfaceType">Surface Type</Label>
                <Select value={editData.surfaceType} onValueChange={(value: any) => 
                  setEditData(prev => ({ ...prev, surfaceType: value }))
                }>
                  <SelectTrigger data-testid="edit-surface-type">
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
                <Label htmlFor="editStatus">Status</Label>
                <Select value={editData.status} onValueChange={(value: any) => 
                  setEditData(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger data-testid="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="edit-description"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editHourlyRate">Regular Rate ($/hour)</Label>
                <Input
                  id="editHourlyRate"
                  type="number"
                  step="0.01"
                  value={editData.hourlyRate}
                  onChange={(e) => setEditData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                  required
                  data-testid="edit-hourly-rate"
                />
              </div>
              <div>
                <Label htmlFor="editPeakHourlyRate">Peak Rate ($/hour)</Label>
                <Input
                  id="editPeakHourlyRate"
                  type="number"
                  step="0.01"
                  value={editData.peakHourlyRate}
                  onChange={(e) => setEditData(prev => ({ ...prev, peakHourlyRate: e.target.value }))}
                  required
                  data-testid="edit-peak-rate"
                />
              </div>
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
                disabled={updateCourtMutation.isPending}
                data-testid="button-save-changes"
              >
                {updateCourtMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
