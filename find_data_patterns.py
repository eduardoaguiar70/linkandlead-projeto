import requests
import json

url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/tasks"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
}

print("Fetching 5 tasks where client_id is NOT NULL...")
resp = requests.get(url + "?client_id=not.is.null&select=id,client_id,lead_id,leads(id,client_id)&limit=5", headers=headers)
if resp.status_code == 200:
    print(json.dumps(resp.json(), indent=2))
else:
    print(f"Error: {resp.status_code}")

print("\nFetching 5 tasks where leads.client_id is 10...")
# Supabase filtering through join is tricky via REST, so I'll just fetch a few and filter in python
resp = requests.get(url + "?select=id,client_id,lead_id,leads(id,client_id)&limit=50", headers=headers)
if resp.status_code == 200:
    count = 0
    for row in resp.json():
        if row.get('leads') and str(row['leads'].get('client_id')) == '10':
            print(json.dumps(row, indent=2))
            count += 1
            if count >= 5: break
