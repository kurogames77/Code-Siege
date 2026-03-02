import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kunwbiebisgpugggbvqy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bndiaWViaXNncHVnZ2didnF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5ODczMCwiZXhwIjoyMDg0NTc0NzMwfQ.pJKcI5rGkMKfkLnaOKemxNpvfVNT9ARty3heh6T_hBE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEverything() {
    try {
        // 1. Get all users
        const { data: users, error: userError } = await supabase.from('users').select('id, username, student_id');
        if (userError) throw userError;

        console.log('=== USERS ===');
        const morbid = users.find(u => u.username?.toLowerCase() === 'morbid');
        const arlou = users.find(u => u.username?.toLowerCase().includes('arlou'));

        users.forEach(u => {
            console.log(`- ${u.username} (ID: ${u.id}, StudentID: ${u.student_id})`);
        });

        if (!morbid || !arlou) {
            console.log('\nCould not find both users to check specific relationship.');
        } else {
            console.log(`\nChecking relationship between MORBID (${morbid.id}) and ARLOU (${arlou.id})`);

            const { data: notifs, error: notifError } = await supabase
                .from('notifications')
                .select('*')
                .or(`sender_id.eq.${morbid.id},receiver_id.eq.${morbid.id}`)
                .or(`sender_id.eq.${arlou.id},receiver_id.eq.${arlou.id}`);

            if (notifError) throw notifError;

            console.log('\n=== NOTIFICATIONS BETWEEN THEM ===');
            if (notifs.length === 0) {
                console.log('No notifications found between these two users.');
            } else {
                notifs.forEach(n => {
                    console.log(`- Type: ${n.type}, From: ${n.sender_id}, To: ${n.receiver_id}, Status: ${n.action_status}, Title: ${n.title}`);
                });
            }
        }

        // 2. Check ALL friend requests
        const { data: allNotifs, error: allNotifError } = await supabase
            .from('notifications')
            .select('*')
            .eq('type', 'friend_request');

        if (allNotifError) throw allNotifError;
        console.log(`\n=== ALL FRIEND REQUESTS IN DB: ${allNotifs.length} ===`);
        allNotifs.forEach(n => {
            console.log(`- Sender: ${n.sender_id}, Receiver: ${n.receiver_id}, Status: ${n.action_status}`);
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

checkEverything();
