import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: logs, error } = await s.from('system_logs')
        .select('created_at, level, source, message')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error('Error:', error);
        return;
    }

    logs.forEach(l => {
        console.log(`[${l.created_at}] [${l.level}] [${l.source}] ${l.message}`);
    });
}

main();
