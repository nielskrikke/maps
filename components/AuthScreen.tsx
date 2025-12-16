
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

  const handleLogin = async () => {
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

    // Replicate the deterministic password generation
    const dummyEmail = `${lowerCaseUsername}@dnd-map-login.local`;
    const dummyPassword = `DUMMY_PASSWORD_FOR_${lowerCaseUsername}`;

    const { error } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: dummyPassword,
    });

    if (error) {
      if (error.message === 'Invalid login credentials') {
         setInternalError("User not found or incorrect credentials. Please contact your DM to create an account.");
      } else {
         setInternalError(error.message);
      }
    }
    
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && username) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-950">
      <div className="w-full max-w-md bg-stone-900/60 backdrop-blur-2xl border border-stone-700/50 shadow-2xl rounded-3xl p-8 animate-modal-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src="https://nielskrikke.com/wp-content/uploads/2025/12/maps-app-icon-v2.png" 
            alt="World Atlas Logo" 
            className="w-20 h-20 mb-4 rounded-2xl shadow-lg border-2 border-amber-600/30"
          />
          <h1 className="text-4xl font-medieval font-bold mb-2 text-amber-500 drop-shadow-md">
            World Atlas
          </h1>
          <p className="text-stone-400">
            Enter your username to log in
          </p>
        </div>

        {displayError && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800/50 rounded-xl">
            <p className="text-red-300 text-sm">{displayError}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-stone-300">
              Username
            </label>
            <div className="relative group">
              <Icon name="user" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-500 group-focus-within:text-amber-500 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-stone-800/40 border border-stone-600/50 rounded-xl w-full pl-10 pr-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                placeholder="Enter username"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={loading || !username}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center disabled:hover:scale-100"
          >
            {loading && !displayError ? <Icon name="spinner" className="animate-spin h-5 w-5" /> : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
