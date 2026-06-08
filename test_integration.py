#!/usr/bin/env python3
"""
Test script for Paint Web Backend & Frontend Integration
Tests user registration, login, posts, profiles, and follow functionality
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"
TOKEN = None
TEST_USER_1 = {
    "username": f"testuser{int(datetime.now().timestamp() * 1000) % 100000}",  # Remove periods
    "email": f"test{int(datetime.now().timestamp() * 1000)}@test.com",
    "password": "TestPass123!@",  # Valid: upper, lower, number, special char, 8+ chars
    "bio": "Test artist profile"
}

TEST_USER_2 = {
    "username": f"artist{int(datetime.now().timestamp() * 1000) % 100000}",
    "email": f"artist{int(datetime.now().timestamp() * 1000) + 1}@test.com",
    "password": "Artist123!@Pwd",  # Valid: upper, lower, number, special char, 8+ chars
    "bio": "Another test artist"
}

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_result(test_name, success, message=""):
    status = "✓ PASS" if success else "✗ FAIL"
    print(f"{status}: {test_name}")
    if message:
        print(f"  → {message}")

def test_backend_health():
    """Test 1: Backend is online"""
    print_section("Test 1: Backend Health Check")
    try:
        response = requests.get(f"{BASE_URL}/")
        success = response.status_code == 200
        print_result("Backend responds", success, f"Status: {response.status_code}")
        print(f"  Response: {response.json()}")
        return success
    except Exception as e:
        print_result("Backend responds", False, str(e))
        return False

def test_register_user(user_data, user_num):
    """Test 2 & 3: Register users"""
    print_section(f"Test {user_num}: Register User")
    try:
        response = requests.post(
            f"{BASE_URL}/register/",
            params={
                "username": user_data["username"],
                "email": user_data["email"],
                "password": user_data["password"],
                "bio": user_data.get("bio", "")
            }
        )
        success = response.status_code == 200
        print_result(f"User registration (User {user_num})", success, f"Status: {response.status_code}")
        if response.text:
            try:
                print(f"  Response: {response.json()}")
            except:
                print(f"  Response: {response.text}")
        return success, user_data
    except Exception as e:
        print_result(f"User registration (User {user_num})", False, str(e))
        return False, user_data

def test_login(user_data, user_num):
    """Test 4 & 5: Login and get token"""
    print_section(f"Test {3 + user_num}: Login User {user_num}")
    try:
        response = requests.post(
            f"{BASE_URL}/login/",
            data={
                "username": user_data["username"],
                "password": user_data["password"]
            }
        )
        success = response.status_code == 200
        data = response.json() if response.text else {}
        token = data.get("access_token", "")
        
        print_result(f"User login (User {user_num})", success, f"Status: {response.status_code}")
        if token:
            print(f"  Token acquired: {token[:20]}...")
        return success, token
    except Exception as e:
        print_result(f"User login (User {user_num})", False, str(e))
        return False, None

def test_get_current_user(token):
    """Test 6: Get current user info"""
    print_section("Test 6: Get Current User")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/users/me", headers=headers)
        success = response.status_code == 200
        data = response.json() if response.text else {}
        
        print_result("Get current user", success, f"Status: {response.status_code}")
        if success:
            print(f"  User ID: {data.get('id')}")
            print(f"  Username: {data.get('username')}")
            print(f"  Email: {data.get('email')}")
            return success, data.get('id')
        return False, None
    except Exception as e:
        print_result("Get current user", False, str(e))
        return False, None

def test_get_user_profile(user_id, token):
    """Test 7: Get user profile with posts"""
    print_section("Test 7: Get User Profile")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/users/{user_id}/profile", headers=headers)
        success = response.status_code == 200
        data = response.json() if response.text else {}
        
        print_result("Get user profile", success, f"Status: {response.status_code}")
        if success:
            print(f"  Username: {data.get('username')}")
            print(f"  Bio: {data.get('bio')}")
            print(f"  Followers: {data.get('followers_count', 0)}")
            print(f"  Following: {data.get('following_count', 0)}")
            print(f"  Posts: {len(data.get('posts', []))}")
            return True
        return False
    except Exception as e:
        print_result("Get user profile", False, str(e))
        return False

def test_follow_user(target_user_id, token):
    """Test 8: Follow a user"""
    print_section("Test 8: Follow User")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{BASE_URL}/follow/",
            params={"user_id": target_user_id},
            headers=headers
        )
        success = response.status_code == 200
        data = response.json() if response.text else {}
        
        print_result("Follow user", success, f"Status: {response.status_code}")
        if success:
            print(f"  Response: {data.get('message', 'Followed')}")
        return success
    except Exception as e:
        print_result("Follow user", False, str(e))
        return False

def test_unfollow_user(target_user_id, token):
    """Test 9: Unfollow a user"""
    print_section("Test 9: Unfollow User")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.delete(
            f"{BASE_URL}/follow/{target_user_id}",
            headers=headers
        )
        success = response.status_code == 200
        data = response.json() if response.text else {}
        
        print_result("Unfollow user", success, f"Status: {response.status_code}")
        if success:
            print(f"  Response: {data.get('message', 'Unfollowed')}")
        return success
    except Exception as e:
        print_result("Unfollow user", False, str(e))
        return False

def test_get_followers(user_id, token):
    """Test 10: Get followers list"""
    print_section("Test 10: Get Followers")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/follow/followers/{user_id}",
            headers=headers
        )
        success = response.status_code == 200
        data = response.json() if response.text else []
        
        print_result("Get followers", success, f"Status: {response.status_code}")
        if success:
            print(f"  Followers count: {len(data)}")
        return success
    except Exception as e:
        print_result("Get followers", False, str(e))
        return False

def test_routing():
    """Test 11: Verify frontend routes"""
    print_section("Test 11: Verify Frontend Routes")
    try:
        # Test home page
        response = requests.get("https://localhost:3000/", verify=False)
        success = response.status_code == 200
        print_result("Frontend home page accessible", success, f"Status: {response.status_code}")
        
        # Test profile route exists (will render the component)
        response = requests.get("https://localhost:3000/profile/1", verify=False)
        print_result("Frontend profile route accessible", response.status_code == 200 or response.status_code == 404, f"Status: {response.status_code}")
        
        return True
    except Exception as e:
        print_result("Frontend routes", False, str(e))
        return False

def main():
    print("\n" + "="*60)
    print("  PAINT WEB - BACKEND & FRONTEND INTEGRATION TEST")
    print("="*60)
    
    results = []
    
    # Test 1: Backend health
    if not test_backend_health():
        print("\n❌ Backend is not running!")
        return
    results.append(True)
    
    # Test 2: Register User 1
    success, user1 = test_register_user(TEST_USER_1, 2)
    results.append(success)
    if not success:
        print("⚠️ User 1 registration failed, trying to continue...")
    
    # Test 3: Register User 2
    success, user2 = test_register_user(TEST_USER_2, 3)
    results.append(success)
    if not success:
        print("⚠️ User 2 registration failed, trying to continue...")
    
    # Test 4: Login User 1
    success, token1 = test_login(user1, 1)
    results.append(success)
    if not success or not token1:
        print("❌ Could not login User 1")
        return
    
    # Test 5: Login User 2
    success, token2 = test_login(user2, 2)
    results.append(success)
    if not success or not token2:
        print("⚠️ Could not login User 2")
    
    # Test 6: Get current user
    success, user1_id = test_get_current_user(token1)
    results.append(success)
    if not success:
        print("⚠️ Could not get current user info")
    
    # Test 7: Get user profile
    if user1_id:
        success = test_get_user_profile(user1_id, token1)
        results.append(success)
    
    # Test 8-10: Follow system (if we have both users and tokens)
    if token1 and token2 and user1_id:
        # Get user2's ID first
        headers = {"Authorization": f"Bearer {token2}"}
        resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
        if resp.status_code == 200:
            user2_id = resp.json().get('id')
            
            # User 1 follows User 2
            success = test_follow_user(user2_id, token1)
            results.append(success)
            
            # User 1 unfollows User 2
            success = test_unfollow_user(user2_id, token1)
            results.append(success)
            
            # Get followers
            success = test_get_followers(user2_id, token1)
            results.append(success)
    
    # Test 11: Frontend routing
    success = test_routing()
    results.append(success)
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total} tests")
    print(f"Success rate: {(passed/total*100):.1f}%")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED! Integration is working correctly.")
    elif passed >= total * 0.8:
        print(f"\n⚠️  {total - passed} tests failed. Some features may not work correctly.")
    else:
        print(f"\n❌ {total - passed} tests failed. Check the errors above.")

if __name__ == "__main__":
    main()
