import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertTwice() {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    const userId = users[0].id;
    const itemId = '2b806db9-d3ed-4ff9-937b-d7117e649b1f';

    console.log('Inserting first time...');
    const res1 = await supabase.from('user_purchases').insert({ user_id: userId, item_id: itemId, remarks: 'testpaid' });
    console.log('First insert error:', res1.error);

    console.log('Inserting second time...');
    const res2 = await supabase.from('user_purchases').insert({ user_id: userId, item_id: itemId, remarks: 'testpaid' });
    console.log('Second insert error:', res2.error);
}
testInsertTwice();
