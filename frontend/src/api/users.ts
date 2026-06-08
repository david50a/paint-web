import { apiRequest, API_BASE } from '@/api/client';
import { Post } from '../types';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  profile_image: string | null;
  is_active: boolean;
  created_at: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_followed_by_me: boolean;
}

export interface UserWithPosts extends UserProfile {
  posts: Post[];
}

export async function getUserProfile(userId: number): Promise<UserWithPosts> {
  return apiRequest<UserWithPosts>(`/users/${userId}/profile`);
}

export async function getUserPosts(userId: number): Promise<Post[]> {
  return apiRequest<Post[]>(`/posts/user/${userId}`);
}

export async function followUser(userId: number): Promise<{ message: string }> {
  return apiRequest(`/follow/?user_id=${userId}`, { method: 'POST' });
}

export async function unfollowUser(userId: number): Promise<{ message: string }> {
  return apiRequest(`/follow/${userId}`, { method: 'DELETE' });
}

export async function getFollowers(userId: number): Promise<any[]> {
  return apiRequest(`/follow/followers/${userId}`);
}

export async function getFollowing(userId: number): Promise<any[]> {
  return apiRequest(`/follow/following/${userId}`);
}

export async function updateProfile(data: {
  username?: string;
  bio?: string;
  profile_image?: File;
  profile_image_url?: string;
}): Promise<UserProfile> {
  const formData = new FormData();
  if (data.username) formData.append('username', data.username);
  if (data.bio !== undefined) formData.append('bio', data.bio);
  if (data.profile_image) formData.append('profile_image', data.profile_image);
  if (data.profile_image_url) formData.append('profile_image_url', data.profile_image_url);

  // Use fetch directly for multipart/form-data to let the browser set the boundary
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_BASE}/users/me`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Update failed' }));
    throw new Error(err.detail || 'Update failed');
  }

  return response.json();
}

export async function getSavedPosts(userId: number): Promise<Post[]> {
  return apiRequest<Post[]>(`/save/user/${userId}`);
}
