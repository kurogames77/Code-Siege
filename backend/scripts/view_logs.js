import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function viewLogs() {
    console.log('Fetching recent AUTH_DEBUG logs...');
    const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .eq('level', 'AUTH_DEBUG')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach(log => {
            console.log(`[${log.created_at}] ${log.message}`);
            console.dir(log.metadata, { depth: null });
            console.log('---');
        });
    } else {
        console.log('No AUTH_DEBUG logs found.');
    }
}

viewLogs();
