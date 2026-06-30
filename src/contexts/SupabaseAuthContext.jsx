import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        handleSession(session);
      } catch (error) {
        console.error("Error getting session:", error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Could not restore session. Please try logging in again.",
        });
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession, toast]);

  const signUp = useCallback(async (email, password, options) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};