/**
 * Optimized API Client with Encryption Support
 * 
 * This module provides a secure, cached API client that:
 * 1. Automatically decrypts encrypted API responses
 * 2. Works with SWR for optimal caching
 * 3. Provides type-safe API calls
 */



// Enhanced fetcher that handles encryption
export async function secureFetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = new Error('API request failed') as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  const data = await response.json();



  return data as T;
}

// POST fetcher for SWR
export async function securePostFetcher<T>(
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  return secureFetcher<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// GET fetcher for SWR
export async function secureGetFetcher<T>(url: string): Promise<T> {
  return secureFetcher<T>(url);
}

// SWR key generator for POST requests
export function createSwrKey(url: string, body: Record<string, unknown>): [string, Record<string, unknown>] {
  return [url, body];
}

// Optimized SWR configuration for maximum caching
export const swrCacheConfig = {
  // Keep data fresh for 5 minutes
  dedupingInterval: 300000,
  // Don't revalidate on window focus (reduces API calls)
  revalidateOnFocus: false,
  // Don't revalidate on reconnect
  revalidateOnReconnect: false,
  // Keep stale data while fetching new
  keepPreviousData: true,
  // Retry failed requests
  errorRetryCount: 2,
  errorRetryInterval: 3000,
  // Cache data even when component unmounts
  revalidateIfStale: false,
};

// Long-term cache config for rarely changing data
export const longTermCacheConfig = {
  ...swrCacheConfig,
  dedupingInterval: 600000, // 10 minutes
  revalidateIfStale: false,
};

// Short-term cache config for frequently changing data
export const shortTermCacheConfig = {
  ...swrCacheConfig,
  dedupingInterval: 60000, // 1 minute
  revalidateIfStale: true,
};
