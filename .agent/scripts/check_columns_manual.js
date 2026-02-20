const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually read .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Checking ALL leads columns ---');

    // Fetch one lead and log all keys to see what's available
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching leads:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]).sort());

        const hasCadence = 'cadence_stage' in data[0];
        const hasMsgCount = 'message_count' in data[0];

        console.log(`\nHas cadence_stage: ${hasCadence}`);
        console.log(`Has message_count: ${hasMsgCount}`);
    } else {
        console.log('No leads found to check schema.');
    }
}

checkSchema();
