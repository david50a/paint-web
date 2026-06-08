import requests

BASE_URL = "http://127.0.0.1:8000"

def test_auth():
    # 1. Try to access protected route without token
    print("Checking protected route without token...")
    resp = requests.get(f"{BASE_URL}/posts/all")
    print(f"Status: {resp.status_code}")
    if resp.status_code == 401:
        print("PASS: Access denied without token.")
    else:
        print("FAIL: Access should have been denied.")

    # 2. Login (Assuming user 'testuser' with password 'Password123!' exists)
    # Note: You might need to register first if the user doesn't exist.
    print("\nAttempting login...")
    login_data = {
        "username": "testuser",
        "password": "Password123!"
    }
    # OAuth2PasswordRequestForm expects form data
    resp = requests.post(f"{BASE_URL}/login/", data=login_data)
    print(f"Login Status: {resp.status_code}")
    
    if resp.status_code == 200:
        token = resp.json().get("access_token")
        print("PASS: Login successful, token received.")
        
        # 3. Access protected route with token
        print("\nChecking protected route with token...")
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/posts/all", headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print("PASS: Access granted with token.")
        else:
            print(f"FAIL: Access denied with valid token. Error: {resp.text}")
    else:
        print(f"FAIL: Login failed. Error: {resp.text}")

if __name__ == "__main__":
    test_auth()
