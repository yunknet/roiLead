
import { createClient } from '@supabase/supabase-js';

// Helper to get env vars from runtime (Docker) or build time (Vite)
const getEnv = (key: string) => {
    if (typeof window !== 'undefined' && (window as any)._env_ && (window as any)._env_[key]) {
        return (window as any)._env_[key];
    }
    return import.meta.env[key];
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'placeholder';

console.log('Supabase Config:', {
    source: typeof window !== 'undefined' && (window as any)._env_ ? 'runtime' : 'build',
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length,
    isPlaceholder: supabaseUrl.includes('placeholder')
});

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);
