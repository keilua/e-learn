import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Function to fetch user profile from public.users table with retry logic
  const fetchProfile = async (userId, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        // Use maybeSingle() to avoid PGRST116 error logs when profile doesn't exist yet
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (data) {
          return data;
        }
        
        if (error) {
           console.error('Error fetching profile:', error);
           // Don't break immediately on network error, try again
           if (i === retries - 1) throw error;
        }
        
        // If data is null (profile not created yet), wait and retry
        if (!data) {
           await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i)));
           continue;
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
        if (i === retries - 1) break;
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i)));
      }
    }
    return null;
  };

  // Exposed function to manually refresh profile data (e.g., after edit)
  const refreshProfile = useCallback(async () => {
    if (user) {
      const updatedProfile = await fetchProfile(user.id);
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    // Initialize session and user data
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (mounted) {
          setSession(currentSession);
          if (currentSession?.user) {
            setUser(currentSession.user);
            const userProfile = await fetchProfile(currentSession.user.id);
            if (mounted) setProfile(userProfile);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('Session check error:', error.message);
        if (mounted) {
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Could not connect to authentication service. Please check your internet connection.",
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      
      setSession(currentSession);
      
      if (currentSession?.user) {
        setUser(currentSession.user);
        // Only fetch profile if we don't have it or if the user changed
        if (!profile || profile?.id !== currentSession.user.id) {
            const userProfile = await fetchProfile(currentSession.user.id);
            if (mounted) setProfile(userProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      return { data, error: null };
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Could not sign in.";
      
      if (error.message === "Invalid login credentials") {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Login failed",
        description: errorMessage,
      });
      setLoading(false); // Ensure loading is reset on error
      return { data: null, error };
    }
  }, [toast]);

  const register = useCallback(async (email, password, fullName, role = 'student') => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role 
          },
        },
      });

      if (error) throw error;

      // Attempt to update role if it wasn't set by trigger (fallback)
      if (data?.user && role !== 'student') {
         try {
            await supabase.from('users').update({ role }).eq('id', data.user.id);
         } catch (e) {
            console.log("Could not auto-update role, waiting for admin or trigger", e);
         }
      }

      toast({
        title: "Account created",
        description: "Please check your email to confirm your account.",
      });

      return { data, error: null };
    } catch (error) {
      let errorMessage = error.message || "Could not create account.";
      if (errorMessage.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMessage,
      });
      setLoading(false);
      return { data: null, error };
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setSession(null);
      
      toast({
        title: "Signed out",
        description: "See you next time!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const value = useMemo(() => ({
    user,
    profile,
    role: profile?.role || 'student', // Default to student if no role found
    session,
    loading,
    login,
    register,
    logout,
    refreshProfile,
    isAuthenticated: !!user,
  }), [user, profile, session, loading, login, register, logout, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};