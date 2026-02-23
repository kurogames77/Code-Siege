import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use the Supabase Management API / PostgREST to check for triggers
// We need to use raw SQL via the pg_net or a custom function

async function checkAllTriggers() {
    // Create a temporary function to query triggers
    const createFuncSQL = `
    CREATE OR REPLACE FUNCTION public.list_all_triggers()
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result json;
    BEGIN
        SELECT json_agg(row_to_json(t)) INTO result
        FROM (
            SELECT 
                tg.tgname AS trigger_name,
                ns.nspname AS table_schema,
                cl.relname AS table_name,
                p.proname AS function_name,
                pns.nspname AS function_schema,
                CASE tg.tgtype & 66
                    WHEN 2 THEN 'BEFORE'
                    WHEN 64 THEN 'INSTEAD OF'
                    ELSE 'AFTER'
                END AS timing,
                CASE tg.tgtype & 28
                    WHEN 4 THEN 'INSERT'
                    WHEN 8 THEN 'DELETE'
                    WHEN 16 THEN 'UPDATE'
                    WHEN 20 THEN 'INSERT OR UPDATE'
                    WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
                    WHEN 12 THEN 'INSERT OR DELETE'
                    WHEN 24 THEN 'UPDATE OR DELETE'
                    ELSE 'UNKNOWN'
                END AS event
            FROM pg_trigger tg
            JOIN pg_class cl ON tg.tgrelid = cl.oid
            JOIN pg_namespace ns ON cl.relnamespace = ns.oid
            JOIN pg_proc p ON tg.tgfoid = p.oid
            JOIN pg_namespace pns ON p.pronamespace = pns.oid
            WHERE NOT tg.tgisinternal
        ) t;
        
        RETURN result;
    END;
    $$;
    `;

    // Step 1: Create the function
    console.log('Creating helper function...');
    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
        }
    });

    // Try directly executing the SQL via the pg endpoint
    console.log('Querying triggers via SQL endpoint...');
    const sqlRes = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
        },
        body: JSON.stringify({ query: createFuncSQL })
    });

    console.log('SQL endpoint status:', sqlRes.status);
    if (sqlRes.ok) {
        const text = await sqlRes.text();
        console.log('Response:', text.substring(0, 1000));
    }

    // Try calling the function
    console.log('\nCalling list_all_triggers...');
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_all_triggers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
        },
        body: JSON.stringify({})
    });

    console.log('RPC status:', rpcRes.status);
    const rpcText = await rpcRes.text();
    console.log('Response:', rpcText.substring(0, 2000));

    // Also check: what does auth.users say about this user?
    console.log('\n=== Checking auth.users for imxif006 ===');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users) {
        const target = authUsers.users.find(u => u.email === 'imxif006@gmail.com');
        if (target) {
            console.log('Auth user found:');
            console.log('  id:', target.id);
            console.log('  email:', target.email);
            console.log('  user_metadata:', JSON.stringify(target.user_metadata));
            console.log('  app_metadata:', JSON.stringify(target.app_metadata));
            console.log('  created_at:', target.created_at);
            console.log('  confirmed_at:', target.confirmed_at);
        } else {
            console.log('Auth user NOT found for imxif006@gmail.com');
        }
    }
}

checkAllTriggers();
