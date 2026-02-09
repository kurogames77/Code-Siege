import { supabase } from './lib/supabase.js';
import fs from 'fs';

async function debugLevels() {
    try {
        console.log('Fetching courses from DB...');
        const { data: courses, error } = await supabase.from('courses').select('*');

        if (error) {
            console.error('Error fetching courses:', error);
            fs.writeFileSync('debug_error.txt', JSON.stringify(error, null, 2));
            return;
        }

        console.log(`Found ${courses.length} courses.`);

        const pythonCourse = courses.find(c => c.name.toLowerCase().includes('python'));

        if (!pythonCourse) {
            console.log('Python course not found');
            return;
        }

        console.log(`Found Python Course: ${pythonCourse.id} (${pythonCourse.name})`);

        console.log('Fetching Level 1...');
        const { data: levels, error: lvlError } = await supabase
            .from('course_levels')
            .select('*')
            .eq('course_id', pythonCourse.id)
            .eq('level_order', 1);

        if (lvlError) {
            console.error('Error fetching levels:', lvlError);
            fs.writeFileSync('debug_error.txt', JSON.stringify(lvlError, null, 2));
            return;
        }

        console.log(`Found ${levels.length} entries for Level 1:`);

        levels.forEach(l => {
            console.log('------------------------------------------------');
            console.log(`ID: ${l.id}`);
            console.log(`Title: ${l.title}`);
            console.log(`Description: ${l.description}`);
            console.log(`Mode: ${l.mode}`);
            console.log(`Difficulty: ${l.difficulty}`);
            console.log(`Initial Blocks: ${l.initial_blocks}`);
            console.log(`Initial Code: ${l.initial_code}`);
        });

        fs.writeFileSync('debug_levels.json', JSON.stringify(levels, null, 2));
        console.log('Levels written to debug_levels.json');

    } catch (err) {
        console.error('Unexpected Error:', err);
        fs.writeFileSync('debug_error.txt', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    }
}

debugLevels();
