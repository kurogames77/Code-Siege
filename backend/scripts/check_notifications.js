// Quick diagnostic: check notifications table data and access
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNotifications() {
    console.log('=== Checking notifications table ===\n');

    // 1. Check if table exists and has data
    const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('ERROR querying notifications:', error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
        return;
    }

    console.log(`Total notifications: ${count}`);

    if (data && data.length > 0) {
        data.forEach((n, i) => {
            console.log(`\n--- Notification ${i + 1} ---`);
            console.log(`  ID:            ${n.id}`);
            console.log(`  Type:          ${n.type}`);
            console.log(`  Title:         ${n.title}`);
            console.log(`  Message:       ${n.message}`);
            console.log(`  Sender ID:     ${n.sender_id}`);
            console.log(`  Receiver ID:   ${n.receiver_id}`);
            console.log(`  Action Status: ${n.action_status}`);
            console.log(`  Is Read:       ${n.is_read}`);
            console.log(`  Created At:    ${n.created_at}`);
        });
    } else {
        console.log('  (no notifications found)');
    }

    // 2. Check anon key access (simulates what the frontend sees)
    console.log('\n\n=== Checking ANON KEY access (frontend simulation) ===');
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
        console.log('No anon key found in backend .env, checking frontend .env...');
    }

    // Read frontend .env for the anon key
    const frontendEnvPath = path.join(__dirname, '..', '..', '.env');
    const fs = await import('fs');
    let frontendAnonKey = anonKey;
    try {
        const envContent = fs.readFileSync(frontendEnvPath, 'utf-8');
        const match = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
        if (match) frontendAnonKey = match[1].trim();
    } catch (e) { }

    if (frontendAnonKey) {
        const anonClient = createClient(process.env.SUPABASE_URL, frontendAnonKey);
        const { count: anonCount, error: anonError } = await anonClient
            .from('notifications')
            .select('*', { count: 'exact', head: true });

        if (anonError) {
            console.log(`\n❌ Anon key SELECT: BLOCKED - ${anonError.message}`);
            console.log('⚠️  RLS is likely blocking reads via the anon key!');
            console.log('   The frontend CANNOT read notifications.');
            console.log('   Fix: Run the permissive RLS policies SQL in Supabase.');
        } else {
            console.log(`\n✅ Anon key SELECT: OK - can see ${anonCount} notifications`);
        }

        // Test INSERT with anon key
        const testInsert = await anonClient
            .from('notifications')
            .insert({
                type: 'system',
                title: 'TEST - Delete me',
                message: 'Testing anon key insert',
                receiver_id: '00000000-0000-0000-0000-000000000000',
                is_read: false
            });

        if (testInsert.error) {
            console.log(`❌ Anon key INSERT: BLOCKED - ${testInsert.error.message}`);
            console.log('⚠️  RLS is blocking inserts via the anon key!');
            console.log('   Friend requests and acceptance notifications CANNOT be created from the frontend.');
        } else {
            console.log(`✅ Anon key INSERT: OK`);
            // Clean up test notification
            await supabase.from('notifications')
                .delete()
                .eq('receiver_id', '00000000-0000-0000-0000-000000000000')
                .eq('title', 'TEST - Delete me');
            console.log('   (test notification cleaned up)');
        }
    } else {
        console.log('Could not find anon key to test frontend access.');
    }
}

checkNotifications().catch(console.error);
