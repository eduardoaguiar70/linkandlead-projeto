import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mbbvslduacjiqchnryon.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    console.log('Testing non-existent column')
    const res = await supabase.from('content_library').select('*').eq('fake_column_xyz', 'ecb4efaf-c831-419b-a083-d9d30089e909')
    console.log('Result:', res.error)
}
test()
