# Paint Web - Manual Testing Guide

## 🌐 Browser Access

**Frontend is running at**: http://localhost:3000  
**Backend API is running at**: http://localhost:8000  
**API Documentation**: http://localhost:8000/docs (Swagger UI)

---

## 🧪 Manual Testing Steps

### Step 1: Register a New User

1. Open http://localhost:3000
2. Look for the **Login** button in the top-right navbar
3. Should see a login form or modal
4. Click **"Sign Up"** or **"Register"** link
5. Fill in:
   - **Username**: `artistname123` (alphanumeric, underscores allowed)
   - **Email**: `artist@example.com`
   - **Password**: `StrongPass123!` (must have: upper, lower, number, special char)
   - **Bio**: "My art collection" (optional)
   - **Profile Image**: Upload an image (optional)
6. Click **Register**
7. Should see success message and be logged in

**Expected Result**: ✅ User created, token stored in localStorage, navbar shows username

---

### Step 2: View Your Profile

1. After login, click on your **username** or **profile icon** in the navbar
2. Should navigate to `/profile/{userId}` route
3. You should see:
   - Your avatar (or default user icon)
   - Username and bio
   - Statistics:
     - Posts count
     - Followers count
     - Following count
   - Empty portfolio (no posts yet)
   - "Edit Profile" button
   - "Share Profile" button

**Expected Result**: ✅ Profile page loads with all your information

---

### Step 3: Create a Test Post (Future Feature)

1. Once post creation is implemented, click **Upload** button in navbar
2. Fill in:
   - **Title**: "My First Painting"
   - **Description**: "A beautiful artwork"
   - **Image**: Select an image file
3. Click **Create Post**

**Expected Result**: ⏳ Post appears in your gallery on profile

---

### Step 4: Test Following System (Multiple Users)

**First, create another user test account:**

1. Open a **new incognito/private browser window**
2. Go to http://localhost:3000
3. Register second user:
   - Username: `artist2username`
   - Email: `artist2@example.com`
   - Password: `ArtistPass123!`
4. Log in with this account
5. Note the User ID from profile URL: `/profile/{USER_ID}`

**Then test following:**

1. Go back to **first browser window** (original user logged in)
2. Navigate to second user's profile (if search available) or directly:
   - http://localhost:3000/profile/{SECOND_USER_ID}
3. Click **"Follow"** button
4. Button should change to **"Following"**
5. Following count should increment on their profile
6. Click **"Following"** to unfollow
7. Button changes back to **"Follow"**

**Expected Result**: ✅ Follow/unfollow works, counts update

---

### Step 5: Test Authentication

1. Copy the auth token from browser console:
   ```javascript
   // In browser developer tools console:
   localStorage.getItem('access_token')
   ```
2. Should see a long JWT token
3. Click **Logout** button
4. Token should be removed from localStorage
5. Navbar should show **"Login"** button

**Expected Result**: ✅ Auth state managed correctly

---

### Step 6: Test Navigation

- **Home page** → `http://localhost:3000/`
  - Should show gallery/feed of artworks
  - Should show sidebar with artist collectives
  
- **Profile page** → `http://localhost:3000/profile/{userId}`
  - Should display user's profile
  - Should show their portfolio

- **Navbar interactions**
  - Click logo → back to home
  - Click profile → navigate to your profile
  - Click logout → logged out state

**Expected Result**: ✅ All navigation works smoothly

---

## 🔍 Testing Checklist

### Authentication Flow
- [ ] Registration with valid credentials works
- [ ] Registration rejects invalid usernames/passwords
- [ ] Login works and stores token
- [ ] Token persists on page refresh
- [ ] Logout clears token
- [ ] Navbar shows username when logged in

### Profile System
- [ ] Profile page loads correctly
- [ ] Bio and stats display correctly
- [ ] Profile photo shows (if uploaded)
- [ ] URL includes user ID: `/profile/X`

### Follow System
- [ ] Can follow other users
- [ ] Can unfollow users
- [ ] Follower count updates
- [ ] Follow button state changes

### UI/UX
- [ ] Navbar responsive on mobile
- [ ] Buttons are clickable and provide feedback
- [ ] Text is readable with proper contrast
- [ ] Animations are smooth
- [ ] Page loads without errors

### API Integration
- [ ] No console errors
- [ ] API calls complete successfully
- [ ] Error messages display properly
- [ ] Loading states show while fetching data

---

## 🛠️ Troubleshooting

### Issue: "Cannot find module 'react-router-dom'"
**Solution**: 
```bash
cd frontend
npm install
```

### Issue: Frontend shows blank page
**Solution**: 
- Check browser console for errors (F12)
- Verify backend is running on http://localhost:8000
- Check VITE_API_URL in .env file

### Issue: Login fails with 403 error
**Solution**:
- Verify username exists and password is correct
- Username requires valid characters (alphanumeric + underscores)
- Password must have: uppercase, lowercase, number, special character

### Issue: Profile page 404
**Solution**:
- Verify user ID in URL
- Try accessing `/profile/1` or `/profile/2` for test users
- Check that you're logged in

### Issue: Backend connection refused
**Solution**:
```bash
cd backend/app
python -m uvicorn main:app --reload
```

### Issue: CORS errors in console
**Solution**:
- Backend CORS is configured for localhost:3000 & 5173
- Verify frontend is running on correct port
- Check backend logs for errors

---

## 📊 API Testing with Swagger

Access **Backend API Documentation**: http://localhost:8000/docs

You can test all endpoints directly from the Swagger UI:

1. Go to http://localhost:8000/docs
2. Find endpoint you want to test
3. Click "Try it out"
4. Fill in parameters
5. Click "Execute"
6. View response

**Key endpoints to test:**
- `POST /register/` - Create user
- `POST /login/` - Login user
- `GET /users/me` - Get current user
- `GET /users/{user_id}/profile` - Get user profile
- `POST /follow/` - Follow user
- `DELETE /follow/{user_id}` - Unfollow user

---

## ✨ Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| User Registration | ✅ Complete | Working, with validation |
| User Login | ✅ Complete | JWT tokens implemented |
| User Profile | ✅ Complete | Shows stats and info |
| Profile Page | ✅ Complete | Routing and display working |
| Follow System | ✅ Complete | Follow/unfollow functional |
| Navbar Auth | ✅ Complete | Shows username and logout |
| Post Creation | ⏳ Ready | Code prepared, needs UI form |
| Post Gallery | ⏳ Ready | Backend ready, needs frontend |
| Search | ⏳ Future | Planned feature |
| Messaging | ⏳ Future | Planned feature |

---

## 🎯 Success Indicators

You'll know everything is working when:

1. ✅ You can register and login successfully
2. ✅ Your profile page loads with your info
3. ✅ You can follow/unfollow other users
4. ✅ Navbar shows your username when logged in
5. ✅ No errors in browser console
6. ✅ Pages load smoothly with animations
7. ✅ Navigation between pages works

---

## 📱 Responsive Testing

Test the app on different screen sizes:

- **Desktop**: 1920x1080, 1366x768
- **Tablet**: 768x1024
- **Mobile**: 375x667, 414x896

Use browser developer tools (F12) to switch screen sizes.

---

**Happy Testing!** 🚀

If you encounter any issues, check the logs:
- **Frontend**: Browser Console (F12)
- **Backend**: Terminal where uvicorn is running
