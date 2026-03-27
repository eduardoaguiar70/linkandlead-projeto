import requests
import json

url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/linkedin_posts"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
}

print("Fetching sample post...")
response = requests.get(url + "?limit=1", headers=headers)
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2))
else:
    print(f"Error: {response.status_code}")
    print(response.text)

print("\nChecking for posts with client_id 9...")
response = requests.get(url + "?client_id=eq.9&limit=1", headers=headers)
print(f"Client 9 Response: {response.status_code}")
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2))

print("\nChecking for posts with client_id 10...")
response = requests.get(url + "?client_id=eq.10&limit=1", headers=headers)
print(f"Client 10 Response: {response.status_code}")
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2))
