import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

// Standard client (Anon)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Authenticated client (uses user's token)
export const getAuthenticatedClient = (token) => {
    return createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
};

// Service Role client (Admin access - bypass RLS)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseService = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null;

export default supabase;
