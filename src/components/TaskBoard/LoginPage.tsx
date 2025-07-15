import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LogIn, User, Lock, UserPlus } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const { toast } = useToast();

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Clean up existing state
      cleanupAuthState();
      
      if (isSignUp) {
        // Sign up flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              username: username
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: "Account created successfully!",
            description: "Please check your email to verify your account.",
          });
        }
      } else {
        // Sign in flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: "Welcome back!",
            description: `Logged in successfully`,
          });
          // Force page reload for clean state
          window.location.href = '/';
        }
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? "Sign up failed" : "Login failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo & Header */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-large hover-lift">
              <img 
                src="/lovable-uploads/c516933f-21f1-40ae-869b-9c8b76ebe1dd.png" 
                alt="TaskBoard" 
                className="w-12 h-12"
              />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-2">
              TaskBoard
            </h1>
            <p className="text-muted-foreground">Modern task management for productive teams</p>
          </div>
        </div>

        {/* Login/Signup Card */}
        <div className="bg-gradient-card rounded-2xl p-8 shadow-large border border-white/20 hover-lift">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {isSignUp ? 'Create Account' : 'Welcome back'}
              </h2>
              <p className="text-muted-foreground">
                {isSignUp ? 'Sign up to get started' : 'Sign in to your account to continue'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-foreground">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 bg-white/50 backdrop-blur-sm border-white/20 focus:border-primary focus:ring-primary/20"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/50 backdrop-blur-sm border-white/20 focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/50 backdrop-blur-sm border-white/20 focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full hover-lift"
                disabled={isLoading}
                variant="premium"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isSignUp ? 'Creating Account...' : 'Signing in...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {isSignUp ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                    <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  </div>
                )}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={isLoading}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;