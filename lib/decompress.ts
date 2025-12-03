/**
 * Gzip decompression utility for handling compressed payloads from tracker.js v5.0
 */

import { gunzipSync } from 'zlib';

/**
 * Check if the request contains gzip-compressed data
 * @param contentEncoding - The Content-Encoding header value
 * @returns boolean indicating if content is gzipped
 */
export function isGzipCompressed(contentEncoding: string | null): boolean {
  return contentEncoding?.toLowerCase() === 'gzip';
}

/**
 * Decompress gzip data and parse as JSON
 * @param buffer - The compressed buffer
 * @returns Parsed JSON object
 */
export function decompressGzip<T = unknown>(buffer: Buffer): T {
  try {
    const decompressed = gunzipSync(buffer);
    return JSON.parse(decompressed.toString('utf-8'));
  } catch (error) {
    throw new Error(`Failed to decompress gzip data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse request body - handles both compressed and uncompressed data
 * @param request - The incoming request
 * @returns Parsed JSON body
 */
export async function parseRequestBody<T = unknown>(request: Request): Promise<T> {
  const contentEncoding = request.headers.get('content-encoding');
  
  if (isGzipCompressed(contentEncoding)) {
    // Handle gzip compressed body
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return decompressGzip<T>(buffer);
  } else {
    // Handle normal JSON body
    return request.json() as Promise<T>;
  }
}
