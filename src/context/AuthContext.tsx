import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  enterAsGuest: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession) {
        setIsGuest(false);
      }
      setLoading(false);
    });

    // Listen to session modifications
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sessionState) => {
      setSession(sessionState);
      setUser(sessionState?.user ?? null);
      if (sessionState) {
        setIsGuest(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    return await authService.signUp(email, password, fullName);
  };

  const signIn = async (email: string, password: string) => {
    return await authService.signIn(email, password);
  };

  const signOut = async () => {
    await authService.signOut();
    setIsGuest(false);
  };

  const enterAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isGuest,
        signUp,
        signIn,
        signOut,
        enterAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
