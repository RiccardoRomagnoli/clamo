"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "~/utils/supabase/client";
import { useToast } from "~/components/ui/use-toast";

import * as Sentry from "@sentry/browser";
// Define language type constants locally

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const initializeAuth = async () => {
    let mounted = true;

    try {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log("Auth state changed:", event, newSession);
        if (!mounted) return;

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          Sentry.setUser({
            id: newSession.user.id,
            email: newSession.user.email,
          });
          
          if (event === 'SIGNED_IN') {
            // console.log("User signed in");
          }       
        } else {
          setSession(null);
          setUser(null);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Error during initialization:", error);
      if (mounted) {
        toast({
          title: "Error",
          description: "Failed to initialize session. Please try logging in again.",
          variant: "destructive",
        });
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const cleanup = initializeAuth();
    return () => {
      void cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
