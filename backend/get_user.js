import supabase from './lib/supabase.js';

async function getUser() {
    const { data, error } = await supabase.from('users').select('email').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log('User email:', data[0]?.email);
    }
}

getUser();
