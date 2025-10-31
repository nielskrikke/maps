import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Icon } from './Icons';

interface AuthScreenProps {
  authError: string | null;
  onAuthAttempt: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ authError, onAuthAttempt }) => {
  const [username, setUsername] = useState('');
  const [internalError, setInternalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayError = authError || internalError;

  const handleAuth = async (role: 'DM' | 'Player') => {
    onAuthAttempt();
    setInternalError(null);
    setLoading(true);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
        setInternalError("Username is required.");
        setLoading(false);
        return;
    }
    const lowerCaseUsername = trimmedUsername.toLowerCase();

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setInternalError("Username can only contain letters, numbers, hyphens, and underscores.");
      setLoading(false);
      return;
    }

    // Using a new, unique email domain to create a fresh auth user.
    // This breaks the link to any old, corrupted auth accounts from previous
    // iterations and provides a clean slate for all users.
    const dummyEmail = `${lowerCaseUsername}@dnd-map-login.local`;
    const dummyPassword = `DUMMY_PASSWORD_FOR_${lowerCaseUsername}`;

    // Re-architected flow: Sign-up first. This is more robust.
    // It correctly handles new users and disambiguates existing users from unconfirmed users.

    // Step 1: Attempt to sign up the user. This will work for all genuinely new users.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: dummyEmail,
      password: dummyPassword,
      options: {
        data: {
          username: trimmedUsername,
          role: role,
        },
      },
    });

    if (!signUpError) {
      // Sign-up was successful.
      // If a session is returned, onAuthStateChange will handle it.
      // If email confirmation is required, the user is in a state this app can't resolve, but we can inform them.
      if (signUpData.user && !signUpData.session) {
         setInternalError("Your account has been created, but requires email verification. Please check your Supabase project settings to disable email confirmation for this app to work correctly.");
      }
      setLoading(false);
      return;
    }

    // Step 2: Sign-up failed. Check if it's because the user already exists.
    if (signUpError && signUpError.message === 'User already registered') {
      // This is expected for existing users. Now we can confidently try to sign them in.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: dummyPassword,
      });

      if (signInError) {
        // If sign-in *still* fails, it's a real problem with the existing account.
        // This will correctly surface errors like "Email not confirmed".
        setInternalError(signInError.message);
      }
      // If sign-in is successful, onAuthStateChange will take over.
    } else {
      // A different, unexpected sign-up error occurred.
      setInternalError(signUpError.message);
    }
    
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && username) {
      handleAuth('Player');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-gray-50 to-green-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-primary-600 rounded-full mb-4">
            <Icon name="shield" className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            D&D World Map
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your username to continue
          </p>
        </div>

        {displayError && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{displayError}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Username
            </label>
            <div className="relative">
              <Icon name="user" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-3 rounded-lg border bg-white border-gray-300 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Enter username"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleAuth('Player')}
            disabled={loading || !username}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading && !displayError ? <Icon name="spinner" className="animate-spin h-5 w-5" /> : 'Continue as Player'}
          </button>

          <button
            onClick={() => handleAuth('DM')}
            disabled={loading || !username}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && !displayError ? <Icon name="spinner" className="animate-spin h-5 w-5" /> : (<><Icon name="shield" className="w-4 h-4" /> Continue as DM</>)}
          </button>
        </div>

        <p className="text-sm text-center mt-6 text-gray-600 dark:text-gray-400">
          New users will be automatically registered
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;