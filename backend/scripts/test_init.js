import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const userId = '93974ccc-da59-49ca-bfc9-62b3c64eb62e'; // Assuming Arlou's ID or similar

    const defaultAchievements = [
        // Python Set
        { achievement_id: '1', progress: 0, total: 10, status: 'locked', gem_reward: 2, user_id: userId },
        { achievement_id: '2', progress: 0, total: 10, status: 'locked', gem_reward: 3, user_id: userId },
    ];

    const { data, error } = await supabase
        .from('achievements')
        .upsert(defaultAchievements, { onConflict: ['user_id', 'achievement_id'] })
        .select();

    if (error) {
        console.error('Supabase Error:', error);
    } else {
        console.log('Success:', data);
    }
}

run();
