import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testRegistrationFlow() {
    const testEmail = `test_${Date.now()}@test.com`;
    const testPassword = 'TestPass123!';
    const testUsername = 'Test_Full_Name';
    const testStudentId = 'TEST-001';
    const testCourse = 'BSCS';

    console.log(`=== Testing registration flow with ${testEmail} ===`);

    // Step 1: Sign up (same as production)
    console.log('\n1. Calling supabase.auth.signUp()...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: { username: testUsername },
            emailRedirectTo: 'http://localhost:5173/ConfirmationPage'
        }
    });

    if (authError) {
        console.log('SignUp failed:', authError.message);
        return;
    }

    console.log('SignUp succeeded! User ID:', authData.user.id);

    // Step 2: Wait a moment for the trigger to fire
    console.log('\n2. Waiting 2 seconds for trigger...');
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: Check what the trigger created
    console.log('\n3. Checking what exists in users table BEFORE upsert...');
    const { data: beforeUpsert, error: beforeError } = await supabaseService
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

    if (beforeUpsert) {
        console.log('   Row EXISTS (created by trigger):');
        console.log('   username:', beforeUpsert.username);
        console.log('   student_id:', beforeUpsert.student_id);
        console.log('   course:', beforeUpsert.course);
        console.log('   gems:', beforeUpsert.gems);
        console.log('   email:', beforeUpsert.email);
    } else {
        console.log('   No row found (no trigger). Error:', beforeError?.message);
    }

    // Step 4: UPSERT (same as our fixed code)
    console.log('\n4. Running UPSERT with correct data...');
    const { data: profile, error: profileError } = await supabaseService
        .from('users')
        .upsert({
            id: authData.user.id,
            username: testUsername,
            email: testEmail,
            student_id: testStudentId,
            course: testCourse,
            role: 'user',
            level: 1,
            xp: 0,
            gems: 0,
            selected_hero: '3',
            selected_theme: 'default'
        }, { onConflict: 'id' })
        .select()
        .single();

    if (profileError) {
        console.log('UPSERT FAILED:', profileError.code, profileError.message);
        console.log('   hint:', profileError.hint);
        console.log('   details:', profileError.details);
    } else {
        console.log('UPSERT succeeded!');
        console.log('   username:', profile.username);
        console.log('   student_id:', profile.student_id);
        console.log('   course:', profile.course);
        console.log('   gems:', profile.gems);
    }

    // Step 5: Verify the final state
    console.log('\n5. Final state in database...');
    await new Promise(r => setTimeout(r, 1000));
    const { data: finalState } = await supabaseService
        .from('users')
        .select('username, student_id, course, gems, email')
        .eq('id', authData.user.id)
        .single();

    console.log('   username:', finalState?.username, finalState?.username === testUsername ? '✅' : '❌ WRONG!');
    console.log('   student_id:', finalState?.student_id, finalState?.student_id === testStudentId ? '✅' : '❌ WRONG!');
    console.log('   course:', finalState?.course, finalState?.course === testCourse ? '✅' : '❌ WRONG!');
    console.log('   gems:', finalState?.gems, finalState?.gems === 0 ? '✅' : '❌ WRONG!');

    // Cleanup: delete test user
    console.log('\n6. Cleaning up...');
    await supabaseService.from('users').delete().eq('id', authData.user.id);
    await supabaseService.auth.admin.deleteUser(authData.user.id);
    console.log('   Cleaned up test user');
}

testRegistrationFlow();
