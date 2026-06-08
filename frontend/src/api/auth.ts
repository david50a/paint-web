import { apiRequest, API_BASE } from '@/api/client';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserMe {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  profile_image: string | null;
  is_active: boolean;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  // Login uses OAuth2PasswordRequestForm — must be sent as form-urlencoded
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch(`${API_BASE}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Login failed');
  }

  const data: LoginResponse = await response.json();
  localStorage.setItem('access_token', data.access_token);
  return data;
}

export async function googleLogin(token: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/login/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Google login failed' }));
    throw new Error(err.detail || 'Google login failed');
  }

  const data: LoginResponse = await response.json();
  localStorage.setItem('access_token', data.access_token);
  return data;
}

export async function register(
  username: string,
  email: string,
  password: string,
  bio?: string,
  profileImage?: File
): Promise<void> {
  const params = new URLSearchParams({ username, email, password });
  if (bio) params.append('bio', bio);

  const url = `${API_BASE}/register/?${params.toString()}`;

  let body: BodyInit | undefined;
  let isFormData = false;

  if (profileImage) {
    const fd = new FormData();
    fd.append('profile_image', profileImage);
    body = fd;
    isFormData = true;
  }

  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: isFormData ? body : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/logout/', { method: 'POST' });
  } finally {
    localStorage.removeItem('access_token');
  }
}

export async function getMe(): Promise<UserMe> {
  return apiRequest<UserMe>('/users/me');
}
