import requests
import json

url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/linkedin_posts"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
}

# Try some common column names by checking the error when they are MISSING
# Actually, I can just try to SELECT one.
r = requests.get(url + "?select=id,client_id&limit=1", headers=headers)
print(f"client_id: {r.status_code}")
if r.status_code != 200:
    print(r.text)

r2 = requests.get(url + "?select=id,id_client&limit=1", headers=headers)
print(f"id_client: {r2.status_code}")
if r2.status_code != 200:
    print(r2.text)

r3 = requests.get(url + "?select=id,id_cliente&limit=1", headers=headers)
print(f"id_cliente: {r3.status_code}")
if r3.status_code != 200:
    print(r3.text)
