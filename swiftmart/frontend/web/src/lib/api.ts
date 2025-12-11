// src/lib/api.ts
// src/lib/api.ts
// src/lib/api.ts
import { getAuthToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export class ApiError extends Error {
  public readonly body: any;
  public readonly status: number;
  public readonly statusText: string;

  constructor(message: string, status: number, statusText: string, body: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export const api = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();

  // Normalize headers (handles object or Headers)
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  // Only set JSON content-type when there is a body and it's not FormData
  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // If endpoint starts with '/api', strip it to avoid duplication with BASE_URL
  // This makes the function more robust if an endpoint is passed with the prefix.
  const apiPrefix = '/api';
  const endpointPath = endpoint.startsWith(apiPrefix) ? endpoint.substring(apiPrefix.length) : endpoint;
  const url = `${BASE_URL}${endpointPath}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    // Network, CORS, DNS errors
    console.error('Network error calling API:', networkErr);
    throw new Error(`Network error: ${String(networkErr)}`);
  }

  // If an error status, try to read JSON or text and include it in the thrown Error
  if (!response.ok) {
    const ct = response.headers.get('content-type') || '';
    let bodyText = '';
    try {
      if (ct.includes('application/json')) {
        const json = await response.json();
        bodyText = typeof json === 'string' ? json : JSON.stringify(json);
      } else {
        bodyText = await response.text();
      }
    } catch (readErr) {
      bodyText = `<unable to parse response body: ${String(readErr)}>`;
    }

    console.error('API error', {
      url,
      status: response.status,
      statusText: response.statusText,
      body: bodyText,
    });

    let message: string;
    if (process.env.NODE_ENV === 'development') {
      if (ct.includes('text/html')) {
        message = `API route not found or returned HTML. Status: ${response.status}. Check server logs for the requested URL: ${url}`;
      } else {
        message = bodyText || `HTTP ${response.status} ${response.statusText}`;
      }
    } else {
      message = `HTTP ${response.status}`;
    }

    throw new ApiError(message, response.status, response.statusText, bodyText);
  }

  // Parse success response
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response.text() as unknown as T;
};
