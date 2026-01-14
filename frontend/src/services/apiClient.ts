import { API_BASE_URL, IS_DEBUG } from '../config/api';

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, headers, ...fetchOptions } = options;

    // Build URL with query params
    let url = `${this.baseURL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    // Prepare headers
    const requestHeaders = new Headers(headers);
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    const method = (fetchOptions.method || 'GET').toUpperCase();
    // Always log POST requests for debugging
    if (IS_DEBUG || method === 'DELETE' || method === 'POST') {
      console.log(`[API] ${method} ${url}`);
      if (fetchOptions.body) {
        console.log(`[API] Body:`, fetchOptions.body);
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
      });

      console.log(`[API] Response status: ${response.status}`);

      // Handle non-2xx responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log(`[API] Error data:`, errorData);
        } catch {
          errorData = { message: response.statusText };
        }

        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();
      console.log(`[API] Response data:`, data);

      // Unwrap standard API response shape { success, data, message }
      if (data && typeof data === 'object' && 'data' in data) {
        return data.data as T;
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      console.error('[API] Request failed:', error);
      throw new ApiError(
        'Network error or server unavailable',
        0,
        error
      );
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
