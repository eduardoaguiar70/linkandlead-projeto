import requests

url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/tasks"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
}

print("Counting tasks...")
for cid in [9, 10]:
    resp = requests.get(url + f"?client_id=eq.{cid}&select=id", headers=headers)
    if resp.status_code == 200:
        count = len(resp.json())
        print(f"Client {cid}: {count} tasks")
    else:
        print(f"Client {cid} Error: {resp.status_code}")

print("\nFetching one task with lead details to see if client_id matches...")
resp = requests.get(url + "?select=id,client_id,lead_id,leads(id,client_id)&limit=1", headers=headers)
if resp.status_code == 200:
    for row in resp.json():
        print(json.dumps(row, indent=2))
else:
    print(f"Join Error: {resp.status_code}")
