import { apiRequest } from './client';
import { Comment } from '../types';

export async function toggleLike(postId: number): Promise<{ liked: boolean }> {
  return apiRequest<{ liked: boolean }>(`/like/toggle/${postId}`, {
    method: 'POST'
  });
}

export async function toggleSave(postId: number): Promise<{ saved: boolean }> {
  return apiRequest<{ saved: boolean }>(`/save/toggle/${postId}`, {
    method: 'POST'
  });
}

export async function getComments(postId: number): Promise<Comment[]> {
  return apiRequest<Comment[]>(`/comment/${postId}`);
}

export async function addComment(postId: number, comment: string): Promise<{ message: string }> {
  const params = new URLSearchParams({ post_id: postId.toString(), comment });
  return apiRequest<{ message: string }>(`/comment/?${params.toString()}`, {
    method: 'POST'
  });
}
