import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, withTimeout } from './services/supabase';
import { AppUser, UserProfile } from './types';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import { Icon } from './components/Icons';
import { ItemProvider } from './components/ItemProvider';

type AuthContextType = {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * Creates a user profile in the database. This is typically called for new sign-ups.
 * @param authUser The user object from Supabase auth.
 * @returns An object with the new profile or an error message.
 */
const createAndFetchUserProfile = async (authUser: User): Promise<{ profile: UserProfile | null, error: string | null }> => {
    console.log('New user detected. Fetching fresh user data to ensure metadata is present.');

    let uRes;
    try {
        uRes = await withTimeout(supabase.auth.getUser(), 5000, "Timed out verifying user info.");
    } catch (err: any) {
        console.error("getUser timed out:", err);
        return { profile: null, error: "Verification timed out. Please try again." };
    }
    
    if (uRes.error || !uRes.data.user) {
        console.error("Critical: Could not fetch fresh user details after sign in.", uRes.error);
        return { profile: null, error: "Could not verify your new account. Please try again." };
    }
    const freshUser = uRes.data.user;

    const usernameToInsert = freshUser.user_metadata.username || freshUser.email?.split('@')[0] || `user_${Date.now()}`;
    const roleToInsert = freshUser.user_metadata.role || 'Player';

    let insRes;
    try {
        insRes = await withTimeout(
            supabase.from('users').insert({
                id: freshUser.id,
                username: usernameToInsert,
                role: roleToInsert,
                password_hash: 'managed_by_supabase_auth' // Required by DB constraint
            }).select().single(),
            6000,
            "Timed out creating profile."
        );
    } catch (err: any) {
        console.error("insert user timed out:", err);
        return { profile: null, error: "Creating your profile timed out. Please try again." };
    }
    
    const { data: profile, error: insertError } = insRes;
    
    if (insertError) {
      if (insertError.code === '23505') { // unique violation, profile likely exists
        try {
            const fetchRes = await withTimeout(
                supabase.from('users').select('*').eq('id', freshUser.id).single(),
                5000,
                "Timed out fetching existing profile."
            );
            if (fetchRes.data) return { profile: fetchRes.data, error: null };
            if (fetchRes.error) console.error("Error re-fetching profile after insert failed:", fetchRes.error);
        } catch (err: any) {
            console.error("Re-fetching profile timed out:", err);
        }
      } else {
        console.error("Error creating user profile:", insertError);
      }
      return { profile: null, error: "There was a problem setting up your profile." };
    }

    return { profile, error: null };
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    if (session?.user?.id) {
      try {
        localStorage.removeItem(`dnd_profile_${session.user.id}`);
      } catch (e) {
        console.error("Failed to clear cached profile from localStorage:", e);
      }
    }
    await supabase.auth.signOut();
  }, [session]);
  
  const handleAuthAttempt = useCallback(() => {
    setAuthError(null);
  }, []);

  useEffect(() => {
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setSession(session);
        setAuthError(null);

        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        // 1. Get cached profile or create dynamic local fallback immediately
        let cachedProfile: UserProfile | null = null;
        try {
          const stored = localStorage.getItem(`dnd_profile_${session.user.id}`);
          if (stored) {
            cachedProfile = JSON.parse(stored);
          }
        } catch (e) {
          console.warn("Could not read cached profile:", e);
        }

        const fallbackProfile: UserProfile = cachedProfile || {
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Adventurer',
          role: 'Player'
        };

        // 2. Log in user instantly & disable loading spinner
        setUser({ ...session.user, profile: fallbackProfile });
        setLoading(false);

        // 3. Silently fetch fresh profile in the background to sync roles & usernames
        try {
          const profileRes = await withTimeout(
              supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single(),
              2500, // Short time-cap in background so we don't hold resources or block the client
              "Background sync timeout."
          );

          const { data: profile, error } = profileRes;

          if (profile) {
            setUser({ ...session.user, profile });
            // Cache successfully fetched profile
            try {
              localStorage.setItem(`dnd_profile_${session.user.id}`, JSON.stringify(profile));
            } catch (e) {
              console.warn("Could not cache profile:", e);
            }
          } else if (error && error.code === 'PGRST116') {
            // Profile does not exist, let's create it in background
            const { profile: newProfile } = await createAndFetchUserProfile(session.user);
            if (newProfile) {
              setUser({ ...session.user, profile: newProfile });
              try {
                localStorage.setItem(`dnd_profile_${session.user.id}`, JSON.stringify(newProfile));
              } catch (e) {
                console.warn("Could not cache profile:", e);
              }
            }
          } else if (error) {
            console.warn("Silent background profile fetch warning:", error.message);
          }
        } catch (err) {
          console.warn("Background profile verification skipped/timed out (Offline session). Using local/cached state.");
        }
      } catch (e) {
        console.error("Unhandled error in onAuthStateChange:", e);
        setAuthError("An unexpected error occurred.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-dnd-dark">
        <div className="relative">
          <Icon name="spinner" className="h-16 w-16 animate-spin text-dnd-gold opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-dnd-gold rounded-full animate-pulse shadow-[0_0_15px_rgba(201,173,106,0.5)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, loading: false, signOut }}>
      <ItemProvider>
        {user && session ? <Dashboard /> : <AuthScreen authError={authError} onAuthAttempt={handleAuthAttempt} />}
      </ItemProvider>
    </AuthContext.Provider>
  );
};

export default App;