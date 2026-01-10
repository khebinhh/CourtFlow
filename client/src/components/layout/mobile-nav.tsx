import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Calendar, List, User } from "lucide-react";

export default function MobileNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (location === "/login" || !user) {
    return null;
  }

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home, current: location === "/" },
    { name: "Book", href: "/courts", icon: Calendar, current: location === "/courts" },
    { name: "Bookings", href: "/bookings", icon: List, current: location === "/bookings" },
    { name: "Profile", href: "/profile", icon: User, current: location === "/profile" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="grid grid-cols-4 gap-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center py-3 transition-colors ${
              item.current 
                ? "text-tennis-green" 
                : "text-gray-600 hover:text-tennis-green"
            }`}
            data-testid={`mobile-nav-${item.name.toLowerCase()}`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
