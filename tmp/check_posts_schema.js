
import { supabase } from '../src/services/supabaseClient';

async function check() {
    const { data, error } = await supabase.from('linkedin_posts').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample Data:', data[0]);
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}

check();
