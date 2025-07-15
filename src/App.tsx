import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "./components/TaskBoard/LoginPage";
import { EnhancedTaskBoard } from "./components/TaskBoard/EnhancedTaskBoard";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user session exists in localStorage
    const checkAuth = () => {
      try {
        const sessionData = localStorage.getItem('mockUserSession');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          setUser({ username: session.username });
        }
      } catch (error) {
        console.log('No valid session found');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (userData: { username: string }) => {
    setUser(userData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading TaskBoard...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {user ? (
          <EnhancedTaskBoard />
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;