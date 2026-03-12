import requests

url = "https://mbbvslduacjiqchnryon.supabase.co/rest/v1/tasks"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYnZzbGR1YWNqaXFjaG5yeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDA0MjksImV4cCI6MjA4MDk3NjQyOX0.1vTXo9R7Rk7SNyvps3v_KKkXz5K1DsaadhcNTwLEbPM"
}

response = requests.get(url + "?limit=1", headers=headers)
if response.status_code == 200:
    data = response.json()
    if data:
        keys = list(data[0].keys())
        print(f"Columns in tasks: {', '.join(keys)}")
        if 'client_id' in keys:
            print("FOUND client_id column!")
        else:
            print("MISSING client_id column!")
    else:
        print("No data in tasks table.")
else:
    print(f"Error: {response.status_code}")
