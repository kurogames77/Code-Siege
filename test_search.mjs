import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kunwbiebisgpugggbvqy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bndiaWViaXNncHVnZ2didnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTg3MzAsImV4cCI6MjA4NDU3NDczMH0.Lxz11kDx02GDtoyU0XTWgkePQP8Sj0zFxP4Ra5L_eDw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch(query) {
    console.log(`[Test] Searching for: "${query}"...`);
    const startTime = Date.now();

    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, student_id, avatar_url, xp, level, course')
            .or(`student_id.eq.${query},username.ilike.%${query}%`)
            .limit(1);

        const duration = Date.now() - startTime;
        console.log(`[Test] Query took ${duration}ms. Result:`, data);
        if (error) console.error('[Test] Error:', error);
    } catch (err) {
        console.error('[Test] Unexpected Error:', err);
    }
}

async function run() {
    await testSearch('22-A-01003');
    await testSearch('Arlou');
    process.exit(0);
}

run();
