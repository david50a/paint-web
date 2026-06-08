export const API_BASE = import.meta.env.VITE_API_URL || 'https://localhost:8000';

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

type RequestOptions = {
  method?: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  isFormData?: boolean;
};

export async function apiRequest<T>(
  endpoint: string,
  { method = 'GET', body, headers = {}, isFormData = false }: RequestOptions = {}
): Promise<T> {
  const token = getToken();

  const requestHeaders: Record<string, string> = { ...headers };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData && body) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: requestHeaders,
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(errorData.detail || `HTTP error ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}
