
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { Icon } from './Icons';
import { cn } from '../lib/utils';

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
    <div className="min-h-screen bg-[#0b0c0e] text-dnd-text font-sans selection:bg-dnd-gold selection:text-black">
      <div className="h-screen">
        <div className="h-full flex flex-col items-center justify-center relative bg-[#0b0c0e] overflow-hidden">
          {/* Background Accent */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#c9ad6a]/5 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000 w-full max-w-md px-6">
            <div className="mb-2 relative text-center">
              <h1 className="text-5xl md:text-9xl font-serif font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#e5c983] to-[#8a7238] drop-shadow-2xl uppercase">
                ATLAS
              </h1>
            </div>
            
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#5c5f66] to-transparent mb-10"></div>

            <AnimatePresence mode="wait">
              {displayError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-dnd-red/10 border border-dnd-red/30 rounded-lg w-full"
                >
                  <p className="text-dnd-red text-sm font-bold flex items-center justify-center gap-2">
                    <Icon name="skull" className="w-4 h-4" />
                    {displayError}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <form 
              onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
              className="flex flex-col items-center gap-6 w-full animate-in slide-in-from-bottom-5 duration-500"
            >
              <div className="w-full relative">
                <input 
                  type="text" 
                  placeholder="Enter Username..." 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                  className="w-full bg-[#1b1c20]/80 border border-gray-700 rounded-lg py-4 px-6 text-center text-white placeholder:text-gray-600 focus:border-dnd-gold focus:outline-none transition-colors text-lg font-bold" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading || !username}
                className="group relative w-full px-8 py-4 bg-dnd-gold text-black hover:bg-yellow-600 rounded shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3">
                  {loading ? <Icon name="spinner" className="animate-spin h-5 w-5" /> : 'Open Atlas'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

};

export default AuthScreen;
