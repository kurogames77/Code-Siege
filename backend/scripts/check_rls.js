import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkRLS() {
    // 1. Check RLS policies on users table
    console.log('=== RLS Policies on users table ===');

    // Try to insert with anon key (no auth session) - should fail if RLS blocks it
    const testId = '00000000-0000-0000-0000-000000000099';

    console.log('\n=== Test INSERT with anon key (no auth session) ===');
    const { data: insertResult, error: insertError } = await supabaseAnon
        .from('users')
        .insert({
            id: testId,
            username: 'rls_test_user',
            email: 'rls_test@test.com',
            student_id: 'RLS-TEST-001',
            course: 'BSCS',
            role: 'user',
            level: 1,
            xp: 0,
            gems: 0
        })
        .select()
        .single();

    if (insertError) {
        console.log('INSERT with anon key FAILED:', insertError.code, insertError.message);
        console.log('  hint:', insertError.hint);
        console.log('  details:', insertError.details);
        console.log('  >>> This confirms RLS is blocking profile creation! <<<');
    } else {
        console.log('INSERT with anon key SUCCEEDED:', insertResult);
        // Clean up
        await supabase.from('users').delete().eq('id', testId);
        console.log('  (cleaned up test record)');
    }

    // 2. Check what happens with service role key
    console.log('\n=== Test INSERT with service role key ===');
    const { data: svcResult, error: svcError } = await supabase
        .from('users')
        .insert({
            id: testId,
            username: 'rls_test_svc',
            email: 'rls_test_svc@test.com',
            student_id: 'RLS-TEST-SVC',
            course: 'BSIT',
            role: 'user',
            level: 1,
            xp: 0,
            gems: 0
        })
        .select()
        .single();

    if (svcError) {
        console.log('INSERT with service role FAILED:', svcError.code, svcError.message);
    } else {
        console.log('INSERT with service role SUCCEEDED:');
        console.log('  student_id:', svcResult.student_id);
        console.log('  course:', svcResult.course);
        // Clean up
        await supabase.from('users').delete().eq('id', testId);
        console.log('  (cleaned up test record)');
    }

    // 3. Check the AUTH_SERVICE logs for baloyoskitneil registration 
    console.log('\n=== All logs around Feb 15 ===');
    const { data: allLogs } = await supabase
        .from('system_logs')
        .select('created_at, level, source, message')
        .gte('created_at', '2026-02-15T00:00:00')
        .lte('created_at', '2026-02-15T23:59:59')
        .order('created_at', { ascending: true })
        .limit(20);

    if (allLogs && allLogs.length > 0) {
        allLogs.forEach(log => {
            console.log(`  [${log.created_at}] [${log.level}] [${log.source}] ${log.message}`);
        });
    } else {
        console.log('  No logs found for Feb 15.');
    }
}

checkRLS();
