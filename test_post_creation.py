import requests
import os
from PIL import Image
import io

BASE_URL = "http://127.0.0.1:8000"

def test_post_creation():
    # 1. Login
    login_data = {"username": "testuser", "password": "Password123!"}
    resp = requests.post(f"{BASE_URL}/login/", data=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a dummy image
    img = Image.new('RGB', (100, 100), color = (73, 109, 137))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr = img_byte_arr.getvalue()

    # 3. Create post
    files = {'image': ('test.jpg', img_byte_arr, 'image/jpeg')}
    params = {
        'title': 'Test Post',
        'description': 'This is a test post description'
    }
    
    print("Creating post...")
    resp = requests.post(f"{BASE_URL}/posts/", params=params, files=files, headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"PASS: Post created. Response: {resp.json()}")
        post_id = resp.json().get("post_id")
        
        # 4. Verify post exists in 'all' posts
        print("\nVerifying post exists...")
        resp = requests.get(f"{BASE_URL}/posts/all", headers=headers)
        if resp.status_code == 200:
            posts = resp.json()
            found = any(p['id'] == post_id for p in posts)
            if found:
                print("PASS: Post found in all posts.")
            else:
                print("FAIL: Post NOT found in all posts.")
        else:
            print(f"FAIL: Could not get all posts. Status: {resp.status_code}")
    else:
        print(f"FAIL: Post creation failed. Error: {resp.text}")

if __name__ == "__main__":
    test_post_creation()
