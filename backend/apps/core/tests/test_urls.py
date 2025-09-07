#!/usr/bin/env python
"""
Test script to check Django URL patterns and server status
"""

import requests
import time
import sys

def test_server_connectivity():
    """Test basic server connectivity"""
    try:
        response = requests.get('http://127.0.0.1:8000/api/health/', timeout=10)
        print(f"✅ Health check: {response.status_code}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Server connection failed: {e}")
        return False

def test_resolution_endpoints(token=None):
    """Test resolution-specific endpoints"""
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    # Test a sample resolution ID (this will be 404 if resolution doesn't exist, but should not be URL pattern error)
    test_id = '123e4567-e89b-12d3-a456-426614174000'  # Sample UUID
    
    endpoints = [
        f'/api/resolutions/{test_id}/',
        f'/api/resolutions/{test_id}/interactions/',
        f'/api/resolutions/{test_id}/progress/',
    ]
    
    for endpoint in endpoints:
        try:
            url = f'http://127.0.0.1:8000{endpoint}'
            response = requests.get(url, headers=headers, timeout=10)
            print(f"Endpoint {endpoint}: {response.status_code}")
            
            # If we get 404, that's OK (resolution doesn't exist)
            # If we get URL pattern error, that's bad
            if response.status_code == 404:
                try:
                    error_data = response.json()
                    if 'error' in error_data:
                        print(f"  ✅ Expected 404: {error_data['error']}")
                    else:
                        print(f"  ✅ Expected 404 (no resolution)")
                except:
                    # If it's HTML 404 (URL pattern not found), that's bad
                    if 'text/html' in response.headers.get('content-type', ''):
                        print(f"  ❌ URL pattern not found (HTML 404)")
                    else:
                        print(f"  ✅ Expected 404")
            elif response.status_code == 401:
                print(f"  ✅ Needs authentication (expected without token)")
            elif response.status_code == 403:
                print(f"  ✅ Access denied (expected)")
            else:
                print(f"  Status: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ {endpoint}: {e}")

def main():
    print("🔍 Testing Django server and URL patterns...")
    print("=" * 50)
    
    # Test server connectivity
    if not test_server_connectivity():
        print("❌ Server not running. Please start Django server first.")
        return
    
    print("\n🔍 Testing resolution endpoints...")
    test_resolution_endpoints()
    
    print("\n📝 Summary:")
    print("If you see 'URL pattern not found (HTML 404)', the URLs need fixing.")
    print("If you see 'Expected 404' or 'Needs authentication', URLs are working correctly.")

if __name__ == '__main__':
    main() 