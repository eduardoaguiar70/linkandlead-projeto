import requests
import json

url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/tasks"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
}

print("Looking for tasks with mismatched lead.client_id...")
resp = requests.get(url + "?select=id,client_id,lead_id,leads(id,client_id)&limit=1000", headers=headers)
if resp.status_code == 200:
    mismatches = []
    for row in resp.json():
        t_cid = row.get('client_id')
        l_cid = row.get('leads', {}).get('client_id') if row.get('leads') else None
        
        if t_cid is not None and l_cid is not None and str(t_cid) != str(l_cid):
            mismatches.append(row)
            
    if mismatches:
        print(f"Found {len(mismatches)} mismatches!")
        for m in mismatches[:10]:
            print(f"Task ID: {m['id']} | Task CID: {m['client_id']} | Lead CID: {m['leads']['client_id']}")
    else:
        print("No mismatches found in first 1000 rows.")
else:
    print(f"Error: {resp.status_code}")
