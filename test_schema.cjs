const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve('c:/Users/mcdud/OneDrive/Ambiente de Trabalho/01_Sistema_linklead_DEFINITIVO/.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.from('connection_requests').select('*').limit(1);
    console.log(data);
}
test();
