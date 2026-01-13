import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/contexts/sidebar-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  Calendar,
  BookOpen,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
  Users
} from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { isCollapsed, toggleCollapsed } = useSidebar();

  if (location === "/login" || !user) {
    return null;
  }

  const canManage = user?.role === "admin" || user?.role === "staff";
  const isAdmin = user?.role === "admin";

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home, current: location === "/" },
    { name: "Book Courts", href: "/courts", icon: Calendar, current: location === "/courts" },
    { name: "My Bookings", href: "/bookings", icon: BookOpen, current: location === "/bookings" },
    ...(canManage ? [
      { name: "Court Calendar", href: "/court-calendar", icon: CalendarDays, current: location === "/court-calendar" },
      { name: "Customers", href: "/customers", icon: Users, current: location === "/customers" }
    ] : []),
    ...(isAdmin ? [{ name: "Admin Settings", href: "/admin", icon: Settings, current: location === "/admin" }] : []),
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ${
        isCollapsed ? 'lg:w-20' : 'lg:w-64'
      } bg-white border-r border-gray-200 shadow-lg`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-brand-primary">iTennis/iPickle</h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className="ml-auto"
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  item.current
                    ? "bg-brand-primary text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={`${isCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                {!isCollapsed && item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200">
          <div className={`flex items-center p-4 ${isCollapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="text-xs">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            )}
          </div>
          <div className={`px-4 pb-4 ${isCollapsed ? 'px-2' : ''}`}>
            <Button
              variant="outline"
              className={`w-full ${isCollapsed ? 'px-2' : ''}`}
              onClick={logout}
              data-testid="logout-button"
            >
              <LogOut className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
              {!isCollapsed && "Sign out"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <nav className="flex justify-around py-2">
          {navigation.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  item.current
                    ? "text-brand-primary"
                    : "text-gray-400"
                } flex flex-col items-center px-2 py-1`}
                data-testid={`mobile-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1">{item.name.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
