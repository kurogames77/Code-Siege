
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCourse() {
    console.log('Starting fix...');

    // 1. Find User Yamada
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('username', '%Yamada%');

    if (userError) {
        console.error('Error finding user:', userError);
        return;
    }

    if (!users || users.length === 0) {
        console.error('User "Yamada" not found.');
        return;
    }

    const yamada = users[0];
    console.log('Found Instructor:', yamada.username, yamada.id);

    // 2. Find Python Course
    const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .ilike('name', 'Python');

    if (courseError) {
        console.error('Error finding course:', courseError);
        return;
    }

    if (!courses || courses.length === 0) {
        console.error('Course "Python" not found.');
        // Optional: Create it if it doesn't exist?
        // For now, let's assume it should exist or we might need to create it.
        // Let's create it if missing.
        console.log('Creating Python course...');
        const { data: newCourse, error: createError } = await supabase
            .from('courses')
            .insert({
                id: 'py',
                name: 'Python',
                instructor_id: yamada.id,
                icon_type: 'custom',
                color: 'blue'
            })
            .select();

        if (createError) {
            console.error('Error creating course:', createError);
        } else {
            console.log('Created Python course:', newCourse);
        }
        return;
    }

    const pythonCourse = courses[0];
    console.log('Found Course:', pythonCourse.name, pythonCourse.id, 'Current Instructor:', pythonCourse.instructor_id);

    // 3. Update Instructor
    if (pythonCourse.instructor_id !== yamada.id) {
        const { data: updated, error: updateError } = await supabase
            .from('courses')
            .update({ instructor_id: yamada.id })
            .eq('id', pythonCourse.id)
            .select();

        if (updateError) {
            console.error('Error updating course:', updateError);
        } else {
            console.log('Successfully updated Python course instructor to Yamada:', updated);
        }
    } else {
        console.log('Python course is already assigned to Yamada.');
    }
}

fixCourse();
