import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    let query = supabase
        .from('manual_payments')
        .select(`
            *,
            users!inner (username, email, role)
        `)
        .order('created_at', { ascending: false });

    // Try applying the filter
    query = query.in('users.role', ['student', 'user']);

    const { data, error } = await query;
    console.log("Error:", error);
    console.log("Data length:", data?.length);
    if (data?.length > 0) {
        console.log("Sample:", data[0]);
    }
}

test();
