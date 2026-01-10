import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Calendar, Bell, ChevronDown, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (location === "/login" || !user) {
    return null;
  }

  const canManage = user?.role === "admin" || user?.role === "staff";
  const isAdmin = user?.role === "admin";

  const navigation = [
    { name: "Dashboard", href: "/", current: location === "/" },
    { name: "Book Courts", href: "/courts", current: location === "/courts" },
    { name: "My Bookings", href: "/bookings", current: location === "/bookings" },
    ...(canManage ? [{ name: "Court Calendar", href: "/availability", current: location === "/availability" }] : []),
    ...(isAdmin ? [{ name: "Admin Settings", href: "/admin", current: location === "/admin" }] : []),
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-brand-primary text-white";
      case "staff": return "bg-brand-secondary text-white";
      case "coach": return "bg-brand-dark text-white";
      case "member": return "bg-brand-accent text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <Calendar className="h-8 w-8 text-brand-primary" />
              <h1 className="text-2xl font-bold text-brand-primary">iTennis/iPickle</h1>
            </Link>
            
            <nav className="hidden md:flex space-x-6 ml-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md font-medium transition-colors ${
                    item.current
                      ? "text-brand-primary bg-brand-primary/10"
                      : "text-gray-700 hover:text-brand-primary"
                  }`}
                  data-testid={`link-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Badge className={getRoleBadgeColor(user.role)} data-testid="badge-user-role">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block">{user.firstName} {user.lastName}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="menu-profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
