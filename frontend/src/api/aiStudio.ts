import { apiRequest } from '@/api/client';

export interface AIGenerateRequest {
  prompt: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
  publish?: boolean;
  post_title?: string;
  post_description?: string;
}

export interface AIGenerateResponse {
  image_url: string;
  published_post_id?: number;
}

export async function generateAIImage(data: AIGenerateRequest): Promise<AIGenerateResponse> {
  return apiRequest<AIGenerateResponse>('/ai-studio/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
