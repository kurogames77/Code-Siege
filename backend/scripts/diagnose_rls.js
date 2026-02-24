
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

async function diagnose() {
    const results = {
        step: 'FRIENDSHIP DIAGNOSTIC',
        usersFound: [],
        notifications: [],
        acceptedCount: 0,
        friendProfiles: []
    };

    try {
        // 1. Find Arlou
        const { data: userData } = await supabase
            .from('users')
            .select('id, username')
            .ilike('username', '%Arlou%');

        results.usersFound = userData || [];

        if (userData && userData.length > 0) {
            const arlouId = userData[0].id;

            // 2. Notifications
            const { data: notifs } = await supabase
                .from('notifications')
                .select('*')
                .or(`sender_id.eq.${arlouId},receiver_id.eq.${arlouId}`);

            results.notifications = notifs || [];

            // 3. Accepted
            const accepted = results.notifications.filter(n => n.type === 'friend_request' && n.action_status === 'accepted');
            results.acceptedCount = accepted.length;

            if (accepted.length > 0) {
                const friendIds = accepted.map(n => n.sender_id === arlouId ? n.receiver_id : n.sender_id);
                const { data: profiles } = await supabase.from('users').select('id, username').in('id', friendIds);
                results.friendProfiles = profiles || [];
            }
        }
    } catch (err) {
        results.error = err.message;
    }

    console.log(JSON.stringify(results, null, 2));
}

diagnose();
