# Paint Web - Backend & Frontend Integration Guide

## ✅ Completed Integration

The backend and frontend have been successfully connected with a full-featured profile system. Here's what was implemented:

### Backend Enhancements
- **User Profile Endpoint** (`GET /users/{user_id}/profile`) - Returns complete user data with posts, follower counts
- **User Posts Endpoint** (`GET /posts/user/{user_id}`) - Get user's specific posts
- **Follow/Unfollow** - Already existed, works with profile system

### Frontend Features
- **React Router Setup** - Navigation between home and user profiles
- **User Profile Page** (`/profile/:userId`) - Full-page profile view
- **Profile Modal** - Modal popup for profile display
- **Authenticated Navbar** - Shows logged-in user with profile link
- **Follow/Unfollow** - Integrated into profile pages
- **Real-time Stats** - Follower/following counts and post galleries

## 🚀 Getting Started

### Step 1: Install Frontend Dependencies
```bash
cd frontend
npm install
```

This installs react-router-dom and other dependencies. You'll see the package.json has been updated with `react-router-dom: ^6.20.0`.

### Step 2: Start Backend
```bash
cd backend/app
python -m uvicorn main:app --reload
```
Backend will run on `http://localhost:8000`

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

### Step 4: Open Browser
Navigate to `http://localhost:5173`

## 📁 New/Modified Files

### Backend
- `backend/app/schemas.py` - Added UserProfile and UserWithPosts schemas
- `backend/app/routes/users.py` - Added profile endpoint with posts
- `backend/app/routes/posts.py` - Added user posts endpoint

### Frontend
- `frontend/src/main.tsx` - Added BrowserRouter
- `frontend/src/App.tsx` - Added routing setup
- `frontend/src/api/users.ts` - Enhanced with profile endpoints
- `frontend/src/types.ts` - Updated Post interface
- `frontend/src/components/Navbar.tsx` - Added auth UI
- `frontend/src/components/UserProfile.tsx` - New page component
- `frontend/src/components/ProfileModal.tsx` - New modal component
- `frontend/package.json` - Added react-router-dom dependency

## 🧪 Testing the Integration

### 1. Create a Test Account
- Register new user on frontend
- Note the user ID from the response

### 2. Create Some Posts
- Upload a few paintings/posts
- These should appear on the profile page

### 3. Test Profile Navigation
- Click on profile button in navbar
- Should navigate to `/profile/{userId}`
- Profile should show your posts, bio, stats

### 4. Test Following
- Go to another user's profile
- Click Follow/Unfollow button
- Follower count should update in real-time

### 5. Test Profile Modal
- Current: ArtistProfile still uses mock data
- Next: Update ArtistProfile to use real profiles
- Click on artist in sidebar → should show ProfileModal

## 🔄 API Endpoints Available

```
GET  /users/me                          # Current user
GET  /users/{user_id}                   # User basic info
GET  /users/{user_id}/profile           # User profile with posts
GET  /posts/all                         # All posts feed
GET  /posts/me                          # Current user's posts
GET  /posts/user/{user_id}              # Specific user's posts
POST /follow/?user_id={id}              # Follow user
DELETE /follow/{user_id}                # Unfollow user
GET  /follow/followers/{user_id}        # Get followers
GET  /follow/following/{user_id}        # Get following
```

## 📝 Frontend Routes

```
/                      # Home/Gallery feed
/profile/:userId       # User profile page
```

## ⚠️ Important Notes

1. **Auth Token**: Stored in localStorage as 'access_token'
2. **CORS**: Backend allows localhost:5173 and localhost:3000
3. **Profile Images**: Uploaded files stored in `backend/data/uploads/`
4. **Real-time Stats**: Follow counts update immediately on frontend

## 🎨 Next Steps (Optional)

1. Update ArtistProfile component to use real profile data
2. Add edit profile functionality
3. Add message/chat between users
4. Add search with autocomplete
5. Implement infinite scroll for posts
6. Add notifications system
7. Mobile optimization for profile pages
