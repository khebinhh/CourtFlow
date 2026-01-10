import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Users, UserPlus, Edit, Trash2, ArrowRight } from "lucide-react";
import type { User } from "@shared/schema";

interface MemberListProps {
  showFull?: boolean;
}

export default function MemberList({ showFull = false }: MemberListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    role: "member" as "admin" | "staff" | "member" | "guest" | "coach",
    phone: "",
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin" || user?.role === "staff",
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/auth/register", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Member Added",
        description: "New member has been added successfully.",
      });
      setIsAddModalOpen(false);
      setNewUser({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        password: "",
        role: "member",
        phone: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Member Updated",
        description: "Member information has been updated successfully.",
      });
      setIsEditModalOpen(false);
      setEditingUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const updates = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      role: formData.get("role"),
      phone: formData.get("phone"),
    };

    updateUserMutation.mutate({ id: editingUser.id, updates });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-tennis-green text-white";
      case "staff": return "bg-court-blue text-white";
      case "coach": return "bg-purple-600 text-white";
      case "member": return "bg-tennis-light text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const canManage = user?.role === "admin" || user?.role === "staff";
  const displayUsers = showFull ? users : users?.slice(0, 3);

  if (!canManage && !showFull) {
    return null;
  }

  return (
    <>
      <Card className="border border-gray-100" data-testid="card-member-list">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {showFull ? "All Members" : "Recent Members"}
            </CardTitle>
            {showFull && canManage && (
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-tennis-green hover:bg-tennis-green/90"
                data-testid="button-add-member"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
            {!showFull && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-tennis-green hover:text-tennis-green/80"
                data-testid="button-view-all-members"
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: showFull ? 8 : 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : displayUsers?.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first member.</p>
              {canManage && (
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-tennis-green hover:bg-tennis-green/90"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayUsers?.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  data-testid={`member-${member.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {member.firstName[0]}{member.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                      {member.phone && (
                        <p className="text-xs text-gray-500">{member.phone}</p>
                      )}
                      <Badge className={`${getRoleBadgeColor(member.role)} mt-1 text-xs`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  {canManage && showFull && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(member);
                          setIsEditModalOpen(true);
                        }}
                        data-testid={`button-edit-${member.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="modal-add-member">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                  data-testid="input-first-name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                  data-testid="input-last-name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  required
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  required
                  data-testid="input-username"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  required
                  data-testid="input-password"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value: any) => 
                setNewUser(prev => ({ ...prev, role: value }))
              }>
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  {user?.role === "admin" && <SelectItem value="staff">Staff</SelectItem>}
                  {user?.role === "admin" && <SelectItem value="admin">Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => setIsAddModalOpen(false)}
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-tennis-green hover:bg-tennis-green/90"
                disabled={createUserMutation.isPending}
                data-testid="button-create-member"
              >
                {createUserMutation.isPending ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="modal-edit-member">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  name="firstName"
                  defaultValue={editingUser?.firstName}
                  required
                  data-testid="edit-first-name"
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  name="lastName"
                  defaultValue={editingUser?.lastName}
                  required
                  data-testid="edit-last-name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  name="email"
                  type="email"
                  defaultValue={editingUser?.email}
                  required
                  data-testid="edit-email"
                />
              </div>
              <div>
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  name="phone"
                  defaultValue={editingUser?.phone || ""}
                  data-testid="edit-phone"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="editRole">Role</Label>
              <Select name="role" defaultValue={editingUser?.role}>
                <SelectTrigger data-testid="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  {user?.role === "admin" && <SelectItem value="staff">Staff</SelectItem>}
                  {user?.role === "admin" && <SelectItem value="admin">Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => setIsEditModalOpen(false)}
                data-testid="button-cancel-edit-member"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-tennis-green hover:bg-tennis-green/90"
                disabled={updateUserMutation.isPending}
                data-testid="button-save-member"
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
