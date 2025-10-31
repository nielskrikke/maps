import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import { AppUser, UserProfile } from './types';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import { Icon } from './components/Icons';

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

    const { data, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError || !data.user) {
        console.error("Critical: Could not fetch fresh user details after sign in.", getUserError);
        return { profile: null, error: "Could not verify your new account. Please try again." };
    }
    const freshUser = data.user;

    const usernameToInsert = freshUser.user_metadata.username || freshUser.email?.split('@')[0] || `user_${Date.now()}`;
    const roleToInsert = freshUser.user_metadata.role || 'Player';

    const { data: profile, error: insertError } = await supabase
      .from('users')
      .insert({
        id: freshUser.id,
        username: usernameToInsert,
        role: roleToInsert,
      })
      .select()
      .single();
    
    if (insertError) {
      if (insertError.code === '23505') { // unique violation, profile likely exists
        const { data: existingProfile, error: fetchError } = await supabase.from('users').select('*').eq('id', freshUser.id).single();
        if (existingProfile) return { profile: existingProfile, error: null };
        if(fetchError) console.error("Error re-fetching profile after insert failed:", fetchError);
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
    await supabase.auth.signOut();
  }, []);
  
  const handleAuthAttempt = useCallback(() => {
    setAuthError(null);
  }, []);

  useEffect(() => {
    setLoading(true);

    // Perform a single, explicit check for the session on initial load.
    // This is more reliable than waiting for onAuthStateChange to fire.
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (initialSession?.user) {
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', initialSession.user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error("Initial profile fetch error:", error);
          setAuthError("Could not load your profile.");
          setUser(null);
        } else if (profile) {
          setUser({ ...initialSession.user, profile });
        }
      }
      setSession(initialSession);
      
      // The initial check is complete, we can now safely stop loading.
      setLoading(false);
    });

    // Set up a listener for subsequent auth state changes (e.g., sign-in, sign-out).
    // This will not manage the initial loading state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setAuthError(null);

      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (currentSession?.user) {
         const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Auth listener profile fetch error:", error);
          setAuthError("Could not load your profile. Please try again.");
          setUser(null);
        } else if (profile) {
          setUser({ ...currentSession.user, profile });
        } else if (event === 'SIGNED_IN') {
          // This path is for a brand new user signing in who doesn't have a profile yet.
          const { profile: newProfile, error: createError } = await createAndFetchUserProfile(currentSession.user);
          if (newProfile) {
            setUser({ ...currentSession.user, profile: newProfile });
          } else {
            setAuthError(createError);
            setUser(null);
          }
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Icon name="spinner" className="h-12 w-12 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, loading: false, signOut }}>
      {user && session ? <Dashboard /> : <AuthScreen authError={authError} onAuthAttempt={handleAuthAttempt} />}
    </AuthContext.Provider>
  );
};

export default App;