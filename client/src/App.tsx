import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Dashboard from "@/pages/dashboard";
import Courts from "@/pages/courts";
import Bookings from "@/pages/bookings";
import CourtAvailability from "@/pages/court-availability";
import CourtCalendar from "@/pages/court-calendar";
import AdminSettings from "@/pages/admin-settings";
import Customers from "@/pages/customers";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";


function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/courts" component={Courts} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/availability" component={CourtAvailability} />
      <Route path="/court-calendar" component={CourtCalendar} />
      <Route path="/customers" component={Customers} />
      <Route path="/admin" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const isLoginPage = location === "/login";
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {!isLoginPage && <Sidebar />}
      <main className={`flex-1 ${!isLoginPage ? "lg:ml-64" : ""} pb-20 lg:pb-0`}>
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
