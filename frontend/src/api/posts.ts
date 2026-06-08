import { apiRequest, API_BASE } from '@/api/client';
import { Post } from '../types';

export async function getPosts(): Promise<Post[]> {
  return apiRequest<Post[]>('/posts/all');
}

export async function getFollowingPosts(): Promise<Post[]> {
  return apiRequest<Post[]>('/posts/following');
}

export async function createPost(
  title: string,
  description: string,
  image?: File,
  imageUrl?: string
): Promise<void> {
  const params = new URLSearchParams({ title, description });
  if (imageUrl) {
    params.append('image_url', imageUrl);
  }
  const url = `${API_BASE}/posts/?${params.toString()}`;

  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (image) {
    const fd = new FormData();
    fd.append('image', image);
    body = fd;
  }

  const response = await fetch(url, { method: 'POST', headers, body });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to create post' }));
    throw new Error(err.detail || 'Failed to create post');
  }
}
