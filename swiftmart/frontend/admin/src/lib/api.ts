// src/lib/api.ts
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface RequestOptions extends RequestInit {
  token?: string;
  baseURL?: string;
}

export const api = async <T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  const token = options?.token || getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${options?.baseURL || API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Something went wrong!' }));
    throw new Error(errorData.message || 'API request failed');
  }

  return response.json();
};