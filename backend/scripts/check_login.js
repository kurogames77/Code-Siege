import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // 1. Check the user row
    console.log('=== imxif006 user row ===');
    const { data: user, error } = await s.from('users')
        .select('username, student_id, email, course, gems')
        .eq('email', 'imxif006@gmail.com')
        .single();
    console.log('User:', user);
    console.log('Error:', error);

    // 2. Test the student_id lookup (exactly as login does)
    console.log('\n=== student_id lookup for 22-A-01003 ===');
    const { data: lookup, error: lookupErr } = await s.from('users')
        .select('email')
        .eq('student_id', '22-A-01003')
        .single();
    console.log('Lookup result:', lookup);
    console.log('Lookup error:', lookupErr);

    // 3. List ALL student_ids in the table
    console.log('\n=== All student_ids ===');
    const { data: allUsers } = await s.from('users')
        .select('email, student_id, username');
    allUsers.forEach(u => console.log(`  ${u.email} | student_id: "${u.student_id}" | username: "${u.username}"`));
}

main();
