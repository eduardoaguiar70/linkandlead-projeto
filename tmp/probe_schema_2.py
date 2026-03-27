import requests
import json

url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/linkedin_posts"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
}

# Use PostgREST schema introspection if available
# This requires a specific Accept header
h2 = headers.copy()
h2["Accept"] = "application/json"
r = requests.get(url + "?select=*", headers=h2)
if r.status_code == 200:
    # If we get no data, we can't see the schema this way
    pass

# Try to insert a dummy record (it should fail but might tell us something)
# No, let's just stick to what we know.

print("Schema probe finished.")
