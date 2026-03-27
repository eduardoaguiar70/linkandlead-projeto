import requests
import json

url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/linkedin_posts"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
}

print("Checking column names for linkedin_posts...")
response = requests.options(url, headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    # Most APIs support OPTIONS for CORS/Schema, but maybe not here.
    # Let's try to get a single row but picking everything.
    pass

# Try to get 1 row picking ANY ID.
r2 = requests.get(url + "?limit=1", headers=headers)
if r2.status_code == 200 and r2.json():
    print("Found one record!")
    print(r2.json()[0].keys())
else:
    print("No records found (or no access).")
