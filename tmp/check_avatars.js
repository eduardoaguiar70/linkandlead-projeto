import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
    const { data, error } = await supabase
        .from('leads')
        .select('id, nome, avatar_url')
        .eq('client_id', 9)
        .limit(10)

    if (error) console.error(error)
    else console.log(data)
}

check()
