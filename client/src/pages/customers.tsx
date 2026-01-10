import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Users, 
  UserCheck, 
  UserX,
  Mail,
  Phone,
  Calendar,
  Shield
} from "lucide-react";
import type { User } from "@shared/schema";
import { format } from "date-fns";

export default function Customers() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Check permissions - only admin and staff can view customers
  const canView = user?.role === "admin" || user?.role === "staff";

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: canView,
  });

  if (!canView) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Filter users based on search and role
  const filteredUsers = users.filter(u => {
    const matchesSearch = searchQuery === "" || 
      u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === "all" || u.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  // Count users by role
  const roleCount = {
    total: users.length,
    admin: users.filter(u => u.role === "admin").length,
    staff: users.filter(u => u.role === "staff").length,
    coach: users.filter(u => u.role === "coach").length,
    member: users.filter(u => u.role === "member").length,
    guest: users.filter(u => u.role === "guest").length,
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800";
      case "staff": return "bg-blue-100 text-blue-800";
      case "coach": return "bg-purple-100 text-purple-800";
      case "member": return "bg-green-100 text-green-800";
      case "guest": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": 
      case "staff": 
        return <Shield className="h-4 w-4" />;
      case "coach": 
        return <UserCheck className="h-4 w-4" />;
      case "member": 
        return <Users className="h-4 w-4" />;
      case "guest": 
        return <UserX className="h-4 w-4" />;
      default: 
        return <Users className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
        <p className="text-gray-600 mt-2">View and manage all facility customers</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterRole("all")}>
          <CardContent className="p-4">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-brand-primary" />
              <p className="text-2xl font-bold">{roleCount.total}</p>
              <p className="text-xs text-gray-600">Total Users</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterRole("admin")}>
          <CardContent className="p-4">
            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">{roleCount.admin}</p>
              <p className="text-xs text-gray-600">Admins</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterRole("staff")}>
          <CardContent className="p-4">
            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{roleCount.staff}</p>
              <p className="text-xs text-gray-600">Staff</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterRole("coach")}>
          <CardContent className="p-4">
            <div className="text-center">
              <UserCheck className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{roleCount.coach}</p>
              <p className="text-xs text-gray-600">Coaches</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterRole("member")}>
          <CardContent className="p-4">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{roleCount.member}</p>
              <p className="text-xs text-gray-600">Members</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterRole("guest")}>
          <CardContent className="p-4">
            <div className="text-center">
              <UserX className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="text-2xl font-bold">{roleCount.guest}</p>
              <p className="text-xs text-gray-600">Guests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-customers"
              />
            </div>
            {filterRole !== "all" && (
              <Button
                variant="outline"
                onClick={() => setFilterRole("all")}
                data-testid="button-clear-filter"
              >
                Clear Filter: {filterRole}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No customers found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-semibold text-gray-700">Name</th>
                    <th className="pb-3 font-semibold text-gray-700">Email</th>
                    <th className="pb-3 font-semibold text-gray-700">Phone</th>
                    <th className="pb-3 font-semibold text-gray-700">Role</th>
                    <th className="pb-3 font-semibold text-gray-700">Member Since</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <p className="text-sm text-gray-500">@{customer.username}</p>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {customer.email}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {customer.phone || "N/A"}
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge className={`${getRoleColor(customer.role)} flex items-center gap-1 w-fit`}>
                          {getRoleIcon(customer.role)}
                          {customer.role}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(new Date(customer.createdAt), "MMM d, yyyy")}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}