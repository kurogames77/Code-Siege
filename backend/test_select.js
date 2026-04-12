import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSelectWithNull() {
    console.log('Testing select on user_purchases with shop_items(*)');
    const { data, error } = await supabase
        .from('user_purchases')
        .select('*, shop_items(*)')
        .limit(1);

    console.log('Select Error:', error);
    console.log('Select Data:', data);
}
testSelectWithNull();
