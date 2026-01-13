import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  MapPin,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Court, InsertCourt } from "@shared/schema";

interface CourtFormData {
  name: string;
  courtType: "tennis" | "pickleball";
  surfaceType: "hard" | "clay" | "grass";
  status: "active" | "maintenance" | "inactive";
  hourlyRate: string;
  peakHourlyRate: string;
  openTime: string;
  closeTime: string;
  description: string;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [facilityHours, setFacilityHours] = useState({
    openTime: "06:00",
    closeTime: "23:00",
  });
  const [savedFacilityHours, setSavedFacilityHours] = useState({
    openTime: "06:00",
    closeTime: "23:00",
  });
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [courtsExpanded, setCourtsExpanded] = useState(false);
  const [courtTypeFilter, setCourtTypeFilter] = useState<"tennis" | "pickleball">("tennis");
  const [formData, setFormData] = useState<CourtFormData>({
    name: "",
    courtType: "tennis",
    surfaceType: "hard",
    status: "active",
    hourlyRate: "25.00",
    peakHourlyRate: "35.00",
    openTime: facilityHours.openTime,
    closeTime: facilityHours.closeTime,
    description: "",
  });

  // Check admin permissions
  if (user?.role !== "admin") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  // Fetch courts
  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ["/api/courts"],
  });

  // Create court mutation
  const createCourtMutation = useMutation({
    mutationFn: async (courtData: Omit<InsertCourt, 'id' | 'createdAt'>) => {
      return await apiRequest("/api/courts", "POST", courtData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Court Created",
        description: "New court has been added successfully.",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create court.",
        variant: "destructive",
      });
    },
  });

  // Update court mutation
  const updateCourtMutation = useMutation({
    mutationFn: async ({ id, ...courtData }: { id: string } & Partial<Court>) => {
      return await apiRequest(`/api/courts/${id}`, "PUT", courtData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Court Updated",
        description: "Court information has been updated successfully.",
      });
      setEditingCourt(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update court.",
        variant: "destructive",
      });
    },
  });

  // Delete court mutation
  const deleteCourtMutation = useMutation({
    mutationFn: async (courtId: string) => {
      return await apiRequest(`/api/courts/${courtId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Court Deleted",
        description: "Court has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete court.",
        variant: "destructive",
      });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof staffFormData) => {
      return apiRequest("/api/users/staff", "POST", {
        ...data,
        role: "staff"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Staff account created successfully",
      });
      setShowStaffForm(false);
      setStaffFormData({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create staff account",
        variant: "destructive",
      });
    },
  });

  const saveFacilityHours = () => {
    setSavedFacilityHours(facilityHours);
    // Update all existing courts with new facility hours if needed
    courts.forEach(court => {
      if (court.openTime !== facilityHours.openTime || court.closeTime !== facilityHours.closeTime) {
        updateCourtMutation.mutate({
          id: court.id,
          openTime: facilityHours.openTime,
          closeTime: facilityHours.closeTime,
        });
      }
    });
    toast({
      title: "Success",
      description: "Facility hours saved successfully",
    });
  };

  const handleDeleteCourt = (courtId: string, courtName: string) => {
    if (window.confirm(`Are you sure you want to delete "${courtName}"? This action cannot be undone.`)) {
      deleteCourtMutation.mutate(courtId);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      courtType: "tennis",
      surfaceType: "hard",
      status: "active",
      hourlyRate: "25.00",
      peakHourlyRate: "35.00",
      openTime: "06:00",
      closeTime: "23:00",
      description: "",
    });
    setShowAddForm(false);
    setEditingCourt(null);
  };

  const handleEdit = (court: Court) => {
    setEditingCourt(court);
    setFormData({
      name: court.name,
      courtType: court.courtType || "tennis",
      surfaceType: court.surfaceType,
      status: court.status,
      hourlyRate: court.hourlyRate,
      peakHourlyRate: court.peakHourlyRate,
      openTime: court.openTime,
      closeTime: court.closeTime,
      description: court.description || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Court name is required.",
        variant: "destructive",
      });
      return;
    }

    const courtData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
    };

    if (editingCourt) {
      updateCourtMutation.mutate({ id: editingCourt.id, ...courtData });
    } else {
      createCourtMutation.mutate(courtData);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "maintenance": return "bg-orange-100 text-orange-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSurfaceColor = (surface: string) => {
    switch (surface) {
      case "hard": return "bg-blue-100 text-blue-800";
      case "clay": return "bg-orange-100 text-orange-800";
      case "grass": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCourtTypeColor = (courtType: string) => {
    switch (courtType) {
      case "tennis": return "bg-brand-primary/20 text-brand-primary";
      case "pickleball": return "bg-brand-accent/20 text-brand-accent";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Settings</h1>
            <p className="text-gray-600">Manage courts and facility configuration for iTennis/iPickle</p>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-brand-primary hover:bg-brand-primary/90"
            data-testid="button-add-court"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Court
          </Button>
        </div>
      </div>

      {/* Facility Hours Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Facility Operating Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="facility-open-time">Facility Opens At</Label>
              <Input
                id="facility-open-time"
                type="time"
                value={facilityHours.openTime}
                onChange={(e) => {
                  setFacilityHours(prev => ({ ...prev, openTime: e.target.value }));
                  // Update default form data for new courts
                  setFormData(prev => ({ ...prev, openTime: e.target.value }));
                }}
                data-testid="input-facility-open-time"
              />
            </div>
            <div>
              <Label htmlFor="facility-close-time">Facility Closes At</Label>
              <Input
                id="facility-close-time"
                type="time"
                value={facilityHours.closeTime}
                onChange={(e) => {
                  setFacilityHours(prev => ({ ...prev, closeTime: e.target.value }));
                  // Update default form data for new courts
                  setFormData(prev => ({ ...prev, closeTime: e.target.value }));
                }}
                data-testid="input-facility-close-time"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            These hours will be used as defaults for new courts and will determine the booking time slots available in the calendar.
          </p>
          <Button 
            onClick={saveFacilityHours}
            className="mt-4 bg-brand-primary hover:bg-brand-dark"
            disabled={facilityHours.openTime === savedFacilityHours.openTime && facilityHours.closeTime === savedFacilityHours.closeTime}
            data-testid="button-save-facility-hours"
          >
            Save Facility Hours
          </Button>
        </CardContent>
      </Card>

      {/* Facility Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-brand-primary/10 rounded-lg">
                <MapPin className="h-6 w-6 text-brand-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Courts</p>
                <p className="text-2xl font-bold text-gray-900">{courts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Courts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {courts.filter(c => c.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Settings className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Maintenance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {courts.filter(c => c.status === "maintenance").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-brand-secondary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-brand-secondary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${courts.length > 0 ? 
                    (courts.reduce((sum, c) => sum + parseFloat(c.hourlyRate), 0) / courts.length).toFixed(0) 
                    : '0'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Court Form */}
      {(showAddForm || editingCourt) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {editingCourt ? "Edit Court" : "Add New Court"}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                data-testid="button-cancel-form"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Court Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Tennis Court 1"
                    required
                    data-testid="input-court-name"
                  />
                </div>

                <div>
                  <Label htmlFor="courtType">Court Type *</Label>
                  <Select 
                    value={formData.courtType} 
                    onValueChange={(value: "tennis" | "pickleball") => 
                      setFormData(prev => ({ ...prev, courtType: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-court-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tennis">Tennis</SelectItem>
                      <SelectItem value="pickleball">Pickleball</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="surfaceType">Surface Type</Label>
                  <Select 
                    value={formData.surfaceType} 
                    onValueChange={(value: "hard" | "clay" | "grass") => 
                      setFormData(prev => ({ ...prev, surfaceType: value }))
                    }
                  >
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

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: "active" | "maintenance" | "inactive") => 
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-status">
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
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    data-testid="input-hourly-rate"
                  />
                </div>

                <div>
                  <Label htmlFor="peakHourlyRate">Peak Hourly Rate ($)</Label>
                  <Input
                    id="peakHourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.peakHourlyRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, peakHourlyRate: e.target.value }))}
                    data-testid="input-peak-rate"
                  />
                </div>

                <div>
                  <Label htmlFor="openTime">Open Time</Label>
                  <Input
                    id="openTime"
                    type="time"
                    value={formData.openTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, openTime: e.target.value }))}
                    data-testid="input-open-time"
                  />
                </div>

                <div>
                  <Label htmlFor="closeTime">Close Time</Label>
                  <Input
                    id="closeTime"
                    type="time"
                    value={formData.closeTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, closeTime: e.target.value }))}
                    data-testid="input-close-time"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description of the court..."
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-primary/90"
                  disabled={createCourtMutation.isPending || updateCourtMutation.isPending}
                  data-testid="button-save-court"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingCourt ? "Update Court" : "Create Court"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Courts List */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setCourtsExpanded(!courtsExpanded)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>Facility Courts</span>
              <Badge variant="secondary" className="ml-2">
                {courts.filter(c => (c.courtType || "tennis") === courtTypeFilter).length} {courtTypeFilter}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              {courtsExpanded && (
                <div 
                  className="flex bg-gray-100 rounded-full p-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      courtTypeFilter === "tennis"
                        ? "bg-brand-primary text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setCourtTypeFilter("tennis")}
                  >
                    Tennis
                  </button>
                  <button
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      courtTypeFilter === "pickleball"
                        ? "bg-teal-500 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setCourtTypeFilter("pickleball")}
                  >
                    Pickleball
                  </button>
                </div>
              )}
              {courtsExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        {courtsExpanded && (
          <CardContent>
            <div className="space-y-4">
              {courts.filter(c => (c.courtType || "tennis") === courtTypeFilter).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No {courtTypeFilter} courts configured yet.</p>
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 bg-brand-primary hover:bg-brand-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Court
                  </Button>
                </div>
              ) : (
                courts.filter(c => (c.courtType || "tennis") === courtTypeFilter).map((court) => (
                <div
                  key={court.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{court.name}</h3>
                        <Badge className={getCourtTypeColor(court.courtType || "tennis")}>
                          {(court.courtType || "tennis") === "tennis" ? "Tennis" : "Pickleball"}
                        </Badge>
                        <Badge className={getSurfaceColor(court.surfaceType)}>
                          {court.surfaceType}
                        </Badge>
                        <Badge className={getStatusColor(court.status)}>
                          {court.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Regular Rate:</span> ${court.hourlyRate}/hr
                        </div>
                        <div>
                          <span className="font-medium">Peak Rate:</span> ${court.peakHourlyRate}/hr
                        </div>
                        <div>
                          <span className="font-medium">Hours:</span> {court.openTime} - {court.closeTime}
                        </div>
                        <div>
                          <span className="font-medium">Surface:</span> {court.surfaceType}
                        </div>
                      </div>
                      {court.description && (
                        <p className="text-sm text-gray-600 mt-2">{court.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(court)}
                        data-testid={`button-edit-${court.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCourt(court.id, court.name)}
                        className="text-red-600 hover:bg-red-50"
                        data-testid={`button-delete-${court.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
        )}
      </Card>

      {/* Staff Account Management */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Staff Account Management
            <Button
              onClick={() => setShowStaffForm(!showStaffForm)}
              className="bg-brand-primary hover:bg-brand-primary/90"
              data-testid="button-add-staff"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Staff Account
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showStaffForm && (
            <form onSubmit={(e) => {
              e.preventDefault();
              createStaffMutation.mutate(staffFormData);
            }} className="space-y-4 mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="staff-username">Username *</Label>
                  <Input
                    id="staff-username"
                    value={staffFormData.username}
                    onChange={(e) => setStaffFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Username"
                    required
                    data-testid="input-staff-username"
                  />
                </div>
                <div>
                  <Label htmlFor="staff-email">Email *</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    value={staffFormData.email}
                    onChange={(e) => setStaffFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="staff@example.com"
                    required
                    data-testid="input-staff-email"
                  />
                </div>
                <div>
                  <Label htmlFor="staff-password">Password *</Label>
                  <Input
                    id="staff-password"
                    type="password"
                    value={staffFormData.password}
                    onChange={(e) => setStaffFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    required
                    data-testid="input-staff-password"
                  />
                </div>
                <div>
                  <Label htmlFor="staff-phone">Phone</Label>
                  <Input
                    id="staff-phone"
                    value={staffFormData.phone}
                    onChange={(e) => setStaffFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    data-testid="input-staff-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="staff-firstName">First Name *</Label>
                  <Input
                    id="staff-firstName"
                    value={staffFormData.firstName}
                    onChange={(e) => setStaffFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First Name"
                    required
                    data-testid="input-staff-firstName"
                  />
                </div>
                <div>
                  <Label htmlFor="staff-lastName">Last Name *</Label>
                  <Input
                    id="staff-lastName"
                    value={staffFormData.lastName}
                    onChange={(e) => setStaffFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last Name"
                    required
                    data-testid="input-staff-lastName"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowStaffForm(false);
                    setStaffFormData({
                      username: "",
                      email: "",
                      password: "",
                      firstName: "",
                      lastName: "",
                      phone: "",
                    });
                  }}
                  data-testid="button-cancel-staff"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-primary/90"
                  disabled={createStaffMutation.isPending}
                  data-testid="button-create-staff"
                >
                  Create Staff Account
                </Button>
              </div>
            </form>
          )}
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Staff Account Privileges:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• View and manage Court Calendar</li>
              <li>• Create, modify, and cancel bookings</li>
              <li>• View customer information</li>
              <li>• Access booking reports</li>
              <li>• Cannot modify facility settings or create other accounts</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}