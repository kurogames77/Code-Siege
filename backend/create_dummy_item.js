import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createDummyItem() {
    // Check if it exists
    const { data: existing } = await supabase
        .from('shop_items')
        .select('id')
        .eq('name', 'Gem Top Up')
        .single();
        
    if (existing) {
        console.log('Dummy item already exists:', existing.id);
        return;
    }

    // Insert dummy item
    const { data, error } = await supabase
        .from('shop_items')
        .insert({
            name: 'Gem Top Up',
            type: 'consumable',
            price: 0,
            description: 'Internal tracking item for gem topups'
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error creating dummy item:', error);
    } else {
        console.log('Dummy item created with ID:', data.id);
    }
}
createDummyItem();
