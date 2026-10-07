'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AppUser, UserRole } from '@/lib/types/database';

interface AuthContextValue {
  user: any | null;
  session: any | null;
  profile: AppUser | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    metadata?: { fullName?: string; phone?: string; role?: UserRole; serviceCategory?: string }
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<any>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<AppUser | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Track the user id whose profile is already fetched so we never double-fetch
  const fetchedForUserId = useRef<string | null>(null);

  const fetchProfile = async (userId: string): Promise<AppUser | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        role: data.role,
        accountStatus: data.account_status,
        isVerified: data.is_verified,
        area: data.area,
        createdAt: data.created_at,
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // 1. Resolve the current session immediately — this is the only place we
    //    call fetchProfile on initial load.  We mark loading=false as soon as
    //    the session is known so the UI can render without waiting for the DB.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // unblock UI immediately

      if (session?.user) {
        fetchedForUserId.current = session.user.id;
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      }
    });

    // 2. Listen for subsequent auth changes (sign-in, sign-out, token refresh).
    //    Skip the very first INITIAL_SESSION event that Supabase fires right
    //    after getSession() — it carries the same user and would cause a
    //    duplicate profile fetch.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION is fired synchronously with the same data as getSession;
      // skip it to avoid the duplicate round-trip.
      if (event === 'INITIAL_SESSION') return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        // Only re-fetch the profile when the user actually changes
        if (fetchedForUserId.current !== session.user.id) {
          fetchedForUserId.current = session.user.id;
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        }
      } else {
        fetchedForUserId.current = null;
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    metadata: { fullName?: string; phone?: string; role?: UserRole; serviceCategory?: string } = {}
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.fullName || '',
          phone: metadata.phone || '',
          role: metadata.role || 'customer',
          service_category: metadata.serviceCategory || '',
        },
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    fetchedForUserId.current = null;
    setProfile(null);
  };

  const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  const getUserProfile = async (): Promise<AppUser | null> => {
    if (!user) return null;
    return fetchProfile(user.id);
  };

  const refreshProfile = async () => {
    if (!user) return;
    fetchedForUserId.current = null; // force re-fetch
    const p = await fetchProfile(user.id);
    fetchedForUserId.current = user.id;
    setProfile(p);
  };

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
