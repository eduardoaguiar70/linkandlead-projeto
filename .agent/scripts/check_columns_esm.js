import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
    console.log('--- Checking leads table schema ---')

    // Try to fetch one lead with the new columns
    const { data, error } = await supabase
        .from('leads')
        .select('cadence_stage, message_count')
        .limit(1)

    if (error) {
        console.error('Error fetching columns:', error.message)
        console.error('Code:', error.code)
        console.error('Details:', error.details)
        console.error('Hint:', error.hint)
    } else {
        console.log('Success! Columns exist.')
        console.log('Sample data:', data)
    }

    // Also verify if the 'tasks' table relationship is correct
    console.log('\n--- Checking tasks table join ---')
    const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*, leads!inner(cadence_stage)')
        .limit(1)

    if (tasksError) {
        console.error('Error joining tasks with leads:', tasksError.message)
    } else {
        console.log('Join successful!')
    }
}

checkSchema()
