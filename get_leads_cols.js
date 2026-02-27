import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function getCols() {
    const { data, error } = await supabase.from('leads').select('*').limit(1)
    console.log(data ? Object.keys(data[0]) : error)
}
getCols()
