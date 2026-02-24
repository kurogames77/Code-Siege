import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFriends(username) {
    console.log(`Checking friends for user: ${username}`);

    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username)
        .single();

    if (userError || !user) {
        console.error('User not found:', userError?.message);
        return;
    }

    console.log(`Found user: ${user.username} (${user.id})`);

    const { data: notifs, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'friend_request')
        .eq('action_status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (notifError) {
        console.error('Error fetching notifications:', notifError.message);
        return;
    }

    console.log(`Found ${notifs.length} accepted friend requests.`);

    if (notifs.length > 0) {
        const friendIds = notifs.map(n => n.sender_id === user.id ? n.receiver_id : n.sender_id);
        const { data: profiles, error: profileError } = await supabase
            .from('users')
            .select('id, username')
            .in('id', friendIds);

        if (profileError) {
            console.error('Error fetching profiles:', profileError.message);
        } else {
            console.log('Friend profiles:', profiles.map(p => p.username));
        }
    }
}

const targetUser = process.argv[2] || 'Arlou Lactuan';
checkFriends(targetUser);
