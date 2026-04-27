
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://opbnhdeswgoznxcsmdyg.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wYm5oZGVzd2dvem54Y3NtZHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjE5ODEsImV4cCI6MjA3NDAzNzk4MX0.B41ViriLyprnnU_fKItBWCCLXAZXZBpk02Vpf8J16vE';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

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
