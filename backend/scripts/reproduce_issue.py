import requests
import json
import uuid

BASE_URL = "http://localhost:8000/api"

def login(email, password):
    data = {
        "email": email,
        "password": password
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=data)
        if response.status_code == 200:
            return response.json()["token"]
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login exception: {e}")
        return None

def check_endpoint(endpoint, token):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{BASE_URL}/{endpoint}", headers=headers)
        if response.status_code == 200:
            print(f"SUCCESS: /{endpoint} returned {len(response.json())} items")
            return True
        else:
            print(f"FAILURE: /{endpoint} failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"EXCEPTION: /{endpoint} failed with error: {e}")
        return False

def main():
    print("Starting reproduction script...")
    
    email = "admin@clinic.com"
    password = "admin123"
    
    print(f"Logging in as {email}...")
    token = login(email, password)
    
    if token:
        print("Login successful. Checking endpoints...")
        check_endpoint("pharmacy-stock", token)
        check_endpoint("godowns", token)
        check_endpoint("branches", token)
    else:
        print("Could not get token. Aborting.")

if __name__ == "__main__":
    main()
