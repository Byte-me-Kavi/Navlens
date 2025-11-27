/**
 * API Client Service
 * 
 * Centralized HTTP client using Axios for all API requests.
 * Uses POST requests for security (no sensitive data in URL).
 * Handles authentication, error handling, response transformation, and decryption.
 * 
 * @module shared/services/api/client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { isEncryptedResponse, decryptResponse } from '@/lib/encryption';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

class ApiClient {
  private axios: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.axios = axios.create({
      baseURL,
      withCredentials: true, // Include cookies for authentication
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging (dev only)
    this.axios.interceptors.request.use(
      (config) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging (dev only)
    this.axios.interceptors.response.use(
      (response) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✓ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
        }
        return response;
      },
      (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Handle Axios errors and convert to ApiError
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data: unknown = error.response.data;
      
      const message = (data as any)?.error || (data as any)?.message || error.message || `HTTP ${status}`; // eslint-disable-line @typescript-eslint/no-explicit-any
      const code = 
        status === 401 ? 'UNAUTHORIZED' :
        status === 403 ? 'FORBIDDEN' :
        status === 404 ? 'NOT_FOUND' :
        status === 500 ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR';

      console.error(`❌ API Error [${status}]:`, message);
      
      throw new ApiError(status, message, code, data);
    } else if (error.request) {
      // Request made but no response received
      console.error('❌ Network Error: No response received');
      throw new ApiError(0, 'Network error: No response from server', 'NETWORK_ERROR');
    } else {
      // Error in request setup
      console.error('❌ Request Setup Error:', error.message);
      throw new ApiError(0, error.message, 'REQUEST_ERROR');
    }
  }

  /**
   * POST request (primary method for security)
   * All data sent in request body, not URL
   * Automatically decrypts encrypted responses
   */
  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.axios.post<T>(endpoint, data, {
      headers: options?.headers,
      timeout: options?.timeout,
    });
    
    // Check if response is encrypted and decrypt it
    if (isEncryptedResponse(response.data)) {
      return await decryptResponse(response.data as any) as T;
    }
    
    return response.data;
  }

  /**
   * GET request (deprecated - use POST for sensitive data)
   * Only use for public, non-sensitive endpoints
   * Automatically decrypts encrypted responses
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<T> {
    console.warn('⚠️ GET request used - consider using POST for sensitive data');
    const response = await this.axios.get<T>(endpoint, {
      params,
      headers: options?.headers,
      timeout: options?.timeout,
    });
    
    // Check if response is encrypted and decrypt it
    if (isEncryptedResponse(response.data)) {
      return await decryptResponse(response.data as any) as T;
    }
    
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.axios.put<T>(endpoint, data, {
      headers: options?.headers,
      timeout: options?.timeout,
    });
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.axios.delete<T>(endpoint, {
      data,
      headers: options?.headers,
      timeout: options?.timeout,
    });
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.axios.patch<T>(endpoint, data, {
      headers: options?.headers,
      timeout: options?.timeout,
    });
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient('/api');

// Export class for testing or custom instances
export { ApiClient };
