import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function checkUser() {
    const studentId = '22-A-01004';
    console.log(`Checking for Student ID: '${studentId}'`);

    // 1. Check if the user exists in the public.users table with this student_id
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('student_id', studentId);

    if (error) {
        console.error('Error querying users table:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No user found with this Student ID in public.users table.');
    } else {
        console.log(`Found ${users.length} user(s) in public.users:`);
        users.forEach(u => {
            console.log(`- ID: ${u.id}`);
            console.log(`  Email: ${u.email}`);
            console.log(`  Student ID: '${u.student_id}' (Length: ${u.student_id ? u.student_id.length : 'N/A'})`);
            console.log(`  Course: ${u.course}`);
        });
    }
    // 2. Try to login (to check password/email confirmation)
    console.log('\nAttributes checked. Attempting login with:');
    console.log(`Email: ${users[0].email}`);
    console.log(`Password: 'Arlou7777'`);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: users[0].email,
        password: 'Arlou7777' // Password from screenshot
    });

    if (authError) {
        console.error('\nLogin Failed:', authError.message);
        if (authError.message.includes('Email not confirmed')) {
            console.log('-> CAUSE: Email is not confirmed. Please check your inbox or disable email confirmation in Supabase.');
        } else if (authError.message.includes('Invalid login credentials')) {
            console.log('-> CAUSE: Wrong password.');
        }
    } else {
        console.log('\nLogin Successful!');
        console.log('Session User:', authData.user.email);
    }
}

checkUser();
