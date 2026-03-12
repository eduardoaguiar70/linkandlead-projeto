import requests
import json

url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/tasks"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
}

print("Simulating application query for Client 9 with STRICT filtering...")
# The strict filter added to the app is: tasks.client_id = 9 AND leads.client_id = 9
# In PostgREST: tasks?client_id=eq.9&leads.client_id=eq.9
query = url + "?select=id,client_id,leads(id,client_id)&client_id=eq.9&leads.client_id=eq.9"
resp = requests.get(query, headers=headers)

if resp.status_code == 200:
    data = resp.json()
    print(f"Total tasks found for Client 9: {len(data)}")
    # Check if Task 553 (the known mismatch) is in the results
    ids = [row['id'] for row in data]
    if 553 in ids:
        print("❌ FAILURE: Task 553 is still appearing for Client 9!")
    else:
        print("✅ SUCCESS: Task 553 is hidden from Client 9's view.")
else:
    print(f"Error: {resp.status_code}")
    print(resp.text)

print("\nSimulating application query for Client 10 with STRICT filtering...")
query = url + "?select=id,client_id,leads(id,client_id)&client_id=eq.10&leads.client_id=eq.10"
resp = requests.get(query, headers=headers)
if resp.status_code == 200:
    data = resp.json()
    print(f"Total tasks found for Client 10: {len(data)}")
    # Check if Task 553 (the known mismatch) is in the results
    ids = [row['id'] for row in data]
    if 553 in ids:
        print("❌ FAILURE: Task 553 is appearing for Client 10 (it shouldn't because leads.client_id=10 but tasks.client_id=9)!")
    else:
        print("✅ SUCCESS: Task 553 is hidden from Client 10's view.")
else:
    print(f"Error: {resp.status_code}")
