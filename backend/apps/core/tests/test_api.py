#!/usr/bin/env python
import requests
import json

def test_api():
    base_url = "http://127.0.0.1:8000"
    
    # Test login
    print("=== Testing Login ===")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    response = requests.post(f"{base_url}/api/token/", json=login_data)
    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data["access"]
        print("✅ Login successful")
        
        # Test user info
        print("\n=== Testing User Info ===")
        headers = {"Authorization": f"Bearer {access_token}"}
        
        user_response = requests.get(f"{base_url}/api/user-info/", headers=headers)
        if user_response.status_code == 200:
            user_data = user_response.json()
            print("✅ User info:", user_data)
            
            # Test resolutions endpoint
            print("\n=== Testing Resolutions Endpoint ===")
            
            # Try secretary endpoint
            resolutions_response = requests.get(f"{base_url}/api/resolutions/secretary/", headers=headers)
            if resolutions_response.status_code == 200:
                resolutions_data = resolutions_response.json()
                print(f"✅ Secretary resolutions count: {len(resolutions_data)}")
                
                if resolutions_data:
                    print("First resolution structure:")
                    print(json.dumps(resolutions_data[0], indent=2, default=str))
                else:
                    print("⚠️ No resolutions found")
            else:
                print(f"❌ Secretary resolutions failed: {resolutions_response.status_code}")
                print(resolutions_response.text)
            
            # Test meetings endpoint
            print("\n=== Testing Meetings Endpoint ===")
            meetings_response = requests.get(f"{base_url}/api/meetings/", headers=headers)
            if meetings_response.status_code == 200:
                meetings_data = meetings_response.json()
                print(f"✅ Meetings count: {len(meetings_data)}")
                
                if meetings_data:
                    print("First meeting structure:")
                    print(json.dumps(meetings_data[0], indent=2, default=str))
            else:
                print(f"❌ Meetings failed: {meetings_response.status_code}")
                
        else:
            print(f"❌ User info failed: {user_response.status_code}")
            print(user_response.text)
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_api() 