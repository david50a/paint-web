import { apiRequest } from './client';

export interface ToggleLikeResponse {
  liked: boolean;
}

export async function toggleLike(postId: number): Promise<ToggleLikeResponse> {
  return apiRequest<ToggleLikeResponse>(`/like/toggle/${postId}`, { method: 'POST' });
}
