const url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/leads?client_id=eq.9&select=id,nome,avatar_url&limit=5";

fetch(url, {
    headers: {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
    }
}).then(r => r.json()).then(console.log).catch(console.error);
