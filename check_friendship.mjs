import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kunwbiebisgpugggbvqy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bndiaWViaXNncHVnZ2didnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTg3MzAsImV4cCI6MjA4NDU3NDczMH0.Lxz11kDx02GDtoyU0XTWgkePQP8Sj0zFxP4Ra5L_eDw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEverything() {
    try {
        // 1. Get all users to find the correct IDs
        const { data: users, error: userError } = await supabase.from('users').select('id, username, student_id');
        if (userError) throw userError;

        console.log('=== USERS ===');
        users.forEach(u => {
            console.log(`- ${u.username} (ID: ${u.id}, StudentID: ${u.student_id})`);
        });

        const morbid = users.find(u => u.username?.toLowerCase() === 'morbid');
        const arlou = users.find(u => u.username?.toLowerCase().includes('arlou'));

        if (!morbid || !arlou) {
            console.log('\nCould not find both users to check specific relationship.');
        } else {
            console.log(`\nChecking relationship between ${morbid.username} (${morbid.id}) and ${arlou.username} (${arlou.id})`);

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

        // 2. Check if there are ANY accepted friend requests at all
        const { data: allAccepted, error: acceptedError } = await supabase
            .from('notifications')
            .select('*')
            .eq('type', 'friend_request')
            .eq('action_status', 'accepted');

        if (acceptedError) throw acceptedError;
        console.log(`\n=== ALL ACCEPTED FRIEND REQUESTS IN DB: ${allAccepted.length} ===`);
        allAccepted.forEach(n => {
            console.log(`- Sender: ${n.sender_id}, Receiver: ${n.receiver_id}`);
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

checkEverything();
