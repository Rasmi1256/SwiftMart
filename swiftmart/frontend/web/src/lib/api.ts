// src/lib/api.ts
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface RequestOptions extends RequestInit {
  token?: string;
}

export const api = async <T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options?.headers,
  });

  const token = options?.token || getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Normalize URL to avoid duplicated slashes or segments and duplicated base path
  const baseUrl = API_BASE_URL?.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  let path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  if (baseUrl && path.startsWith(baseUrl.replace(/^\//, ''))) {
    path = path.slice(baseUrl.length);
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
  }
  const url = `${baseUrl}/${path}`;

  console.log('API Request URL:', url);
  console.log('API Request Headers:', headers);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Something went wrong!' }));
    console.error('API Request Failed:', JSON.stringify(errorData));
    throw new Error(errorData.message || 'API request failed');
  }

  return response.json();
};
