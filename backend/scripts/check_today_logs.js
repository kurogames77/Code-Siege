import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('--- SYSTEM LOGS (LAST 50) ---');
    const today = new Date().toISOString().split('T')[0];
    const { data: logs, error } = await s.from('system_logs')
        .select('created_at, level, source, message, metadata')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    logs.forEach(log => {
        console.log(`[${log.created_at}] [${log.level}] [${log.source}] ${log.message}`);
        if (log.metadata && Object.keys(log.metadata).length > 0) {
            console.log('   Metadata:', JSON.stringify(log.metadata, null, 2));
        }
    });

    console.log('\n--- TARGET USER: imxif006@gmail.com ---');
    const { data: user, error: userError } = await s.from('users')
        .select('*')
        .eq('email', 'imxif006@gmail.com')
        .single();

    if (userError) {
        console.error('Error fetching user:', userError);
    } else {
        console.log(JSON.stringify(user, null, 2));
    }
}

main();
