import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching global user progress...');
    const { data: globalProgresses, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('tower_id', 'global');

    if (error) {
        console.error('Error fetching global progress:', error);
        return;
    }

    let usersProcessed = 0;
    
    for (const gp of globalProgresses) {
        const userId = gp.user_id;
        const level = gp.level;

        if (level >= 1) {
            console.log(`Processing user ${userId} with level ${level}...`);
            const floorsToInsert = [];
            for (let f = 1; f <= level; f++) {
                floorsToInsert.push({
                    user_id: userId,
                    tower_id: '1',
                    floor: f,
                    completed: true,
                    created_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                });
            }

            // Delete existing rows for tower 1 up to 'level' so we don't duplicate
            await supabase.from('user_progress').delete().eq('user_id', userId).eq('tower_id', '1').lte('floor', level);

            // Insert cleanly
            const { error: insertError } = await supabase.from('user_progress').insert(floorsToInsert);
            if (insertError) {
                console.error(`Failed to insert for user ${userId}`, insertError);
            } else {
                console.log(`Successfully synced floors 1-${level} for user ${userId}`);
            }
            usersProcessed++;
        }
    }
    
    console.log(`Completed fixing ${usersProcessed} users.`);
}

run();
