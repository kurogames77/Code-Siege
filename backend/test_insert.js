import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    // get a random user
    const { data: users } = await supabase.from('users').select('id').limit(1);
    const userId = users[0].id;
    console.log('Testing insert for user:', userId);

    const { data, error } = await supabase
        .from('user_purchases')
        .insert({
            user_id: userId,
            remarks: 'testpaid'
        });

    console.log('Insert Error:', error);
    console.log('Insert Data:', data);
}

testInsert();
