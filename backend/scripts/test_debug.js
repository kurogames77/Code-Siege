import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('1. Testing Logger...');
    try {
        await logger.info('TEST', 'Test log message', { foo: 'bar' });
        console.log('Logger called. Checking DB...');

        // Wait a sec for async log
        await new Promise(r => setTimeout(r, 2000));

        const { data: logs } = await supabase
            .from('system_logs')
            .select('*')
            .eq('source', 'TEST')
            .order('created_at', { ascending: false })
            .limit(1);

        if (logs && logs.length > 0) {
            console.log('✅ Log found:', logs[0]);
        } else {
            console.error('❌ Log NOT found in DB.');
        }

    } catch (e) {
        console.error('Logger threw error:', e);
    }

    console.log('\n2. Checking User Columns...');
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (users && users.length > 0) {
        console.log('User Keys:', Object.keys(users[0]));
    } else {
        console.log('No users found to check columns.');
    }
}

runTest();
