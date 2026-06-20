
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://opbnhdeswgoznxcsmdyg.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wYm5oZGVzd2dvem54Y3NtZHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjE5ODEsImV4cCI6MjA3NDAzNzk4MX0.B41ViriLyprnnU_fKItBWCCLXAZXZBpk02Vpf8J16vE';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

// Check if localStorage is available and fully functional in the current environment (e.g., inside third-party iframes)
const getSafeStorage = () => {
  try {
    const testKey = "__supabase_storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (e) {
    console.warn("Storage warning: localStorage is blocked or not available in this environment. Falling back to in-memory storage.");
    
    // In-memory fallback
    const store: Record<string, string> = {};
    return {
      getItem: (key: string): string | null => {
        return store[key] || null;
      },
      setItem: (key: string, value: string): void => {
        store[key] = value;
      },
      removeItem: (key: string): void => {
        delete store[key];
      }
    };
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: getSafeStorage(),
  },
});

/**
 * Ensures the Supabase session is valid and fresh.
 * Auto-refreshes the JWT token if it has expired.
 * Throws a helpful error if the user is no longer logged in.
 */
export const ensureFreshSession = async (): Promise<void> => {
  try {
    const res = await withTimeout(
      supabase.auth.getSession(),
      4000,
      "TIMEOUT"
    );
    const session = res?.data?.session;
    const error = res?.error;

    if (error) {
      console.warn("Session retrieval returned error, proceeding anyway:", error.message);
      return;
    }
    if (!session) {
      throw new Error("Your session has expired or you are not logged in. Please refresh the page or sign in again.");
    }
  } catch (err: any) {
    if (err.message === "TIMEOUT" || err.message.includes("timed out") || err.message.includes("Timeout") || err.message.includes("timeout") || err.message.includes("lag")) {
      console.warn("ensureFreshSession: Session verification timed out or lagged. Proceeding to query anyway for maximum resilience.");
      return; // DO NOT THROW!
    }
    console.warn("Session safety check warned:", err);
    throw err;
  }
};

/**
 * Wraps any promise in a strict timeout.
 * Rejects the promise if it takes longer than timeoutMs.
 */
export const withTimeout = <T>(
  promise: PromiseLike<T> | Promise<T>, 
  timeoutMs: number = 10000, 
  errorMsg: string = "The request timed out. Please check your connection or try again."
): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([
    Promise.resolve(promise).then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise
  ]);
};

export const uploadFile = async (bucket: string, path: string, file: File) => {

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true
  });
  
  if (error) {
    console.error("Upload error details:", error);
    if (error.message.includes('bucket not found') || (error as any).status === 404) {
      throw new Error(`The storage bucket '${bucket}' was not found. Please run the SQL setup script to create it and set permissions.`);
    }
    throw error;
  }
  
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
};
