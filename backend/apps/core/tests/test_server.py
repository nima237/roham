import requests
import time

def test_server():
    try:
        print("Testing Django server...")
        response = requests.get('http://127.0.0.1:8000/api/health/', timeout=5)
        if response.status_code == 200:
            print("✅ Server is running successfully!")
            print("Response:", response.json())
            return True
        else:
            print(f"❌ Server returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    # Wait a few seconds for server to start
    print("Waiting for server to start...")
    time.sleep(10)
    test_server() 