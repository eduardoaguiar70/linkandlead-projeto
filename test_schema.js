import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tjxjzbgzzsxyzyvzpiv.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your_key' // Wait, I need to read the .env file

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve('c:/Users/mcdud/OneDrive/Ambiente de Trabalho/01_Sistema_linklead_DEFINITIVO/.env') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
    const { data, error } = await supabase.from('connection_requests').select('*').limit(1)
    console.log(data)
}
test()
