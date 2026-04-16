import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: courses, error } = await supabase.from('courses').select('*, users!inner(*)');
    if (error) console.error('Error fetching courses:', error);
    else console.log('Courses:', JSON.stringify(courses, null, 2));

    if (courses && courses.length > 0) {
        for (const course of courses) {
             console.log(`\nChecking levels for tower: ${course.title} (ID: ${course.id})`);
             const { data: levels, error: le } = await supabase.from('levels').select('*').eq('course_id', course.id).order('level_order', { ascending: true });
             if (le) console.error(le);
             else {
                 console.log(`Found ${levels.length} levels.`);
                 if (levels.length > 0) {
                     // Check if blocks are valid
                     const zeroBlocks = levels.filter(l => !l.initial_blocks || l.initial_blocks.length === 0);
                     if (zeroBlocks.length > 0) {
                         console.log(`⚠️ WARNING: ${zeroBlocks.length} levels have NO initial blocks! (Levels: ${zeroBlocks.map(l => l.level_number).join(', ')})`);
                     }
                     
                     // Check sequence
                     const zeroSeq = levels.filter(l => !l.expected_output || l.expected_output.length === 0);
                     if (zeroSeq.length > 0) {
                         console.log(`⚠️ WARNING: ${zeroSeq.length} levels have NO expected output sequence!`);
                     }

                     // Print the block data for the first level to verify format
                     console.log(`Level 1 blocks length: ${levels[0].initial_blocks?.length}`);
                 }
             }
        }
    }
}
run();
