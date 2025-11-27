/**
 * API Response Encryption/Decryption
 * 
 * Uses AES-256-GCM for encrypting API responses to prevent inspection in browser DevTools.
 * The encryption key is derived from an environment variable and is only used for obfuscation,
 * not for security against authenticated users (they already have access to the data).
 * 
 * IMPORTANT: Both server and client use PBKDF2 for key derivation to ensure compatibility.
 * Browser's WebCrypto API doesn't support scrypt natively.
 */

// Pre-computed PBKDF2 derived key (base64) for the default passphrase
// This matches what the client will derive using PBKDF2
// Generated using: pbkdf2('navlens-default-key-2024', 'navlens-salt', 100000, 32, 'sha256')
// For custom keys, the server derives the key at runtime

// Server-side encryption (Node.js crypto)
export async function encryptResponse(data: any): Promise<{ encrypted: string; iv: string }> {
  const crypto = await import('crypto');
  
  // Use PBKDF2 instead of scrypt for browser compatibility
  const passphrase = process.env.API_ENCRYPTION_KEY || 'navlens-default-key-2024';
  const salt = 'navlens-salt';
  
  // Derive key using PBKDF2 (same as client-side)
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const jsonData = JSON.stringify(data);
  let encrypted = cipher.update(jsonData, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted + '.' + authTag.toString('base64'),
    iv: iv.toString('base64'),
  };
}

// Client-side decryption key passphrase (must match server)
const CLIENT_PASSPHRASE = 'navlens-default-key-2024';
const CLIENT_SALT = 'navlens-salt';

// Client-side decryption
export async function decryptResponse(encryptedData: { encrypted: string; iv: string }): Promise<any> {
  try {
    const { encrypted, iv } = encryptedData;
    
    // Split encrypted data and auth tag
    const [encData, authTagB64] = encrypted.split('.');
    
    if (!encData || !authTagB64) {
      console.error('❌ Invalid encrypted data format');
      throw new Error('Invalid encrypted data format');
    }
    
    // Import the passphrase as key material for PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(CLIENT_PASSPHRASE),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Derive the same key as server using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(CLIENT_SALT),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decode IV and encrypted data
    const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const encBuffer = Uint8Array.from(atob(encData), c => c.charCodeAt(0));
    const authTag = Uint8Array.from(atob(authTagB64), c => c.charCodeAt(0));
    
    // Combine encrypted data with auth tag for AES-GCM
    const combined = new Uint8Array(encBuffer.length + authTag.length);
    combined.set(encBuffer);
    combined.set(authTag, encBuffer.length);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      combined
    );
    
    const decoder = new TextDecoder();
    const result = JSON.parse(decoder.decode(decrypted));
    
    console.log('🔓 Successfully decrypted response');
    return result;
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw new Error('Failed to decrypt API response');
  }
}

// Wrapper for NextResponse with encryption
import { NextResponse } from 'next/server';

export async function encryptedJsonResponse(
  data: any,
  options?: { status?: number; headers?: Record<string, string> }
) {
  const encrypted = await encryptResponse(data);
  
  return NextResponse.json(
    { _e: true, ...encrypted },
    {
      status: options?.status || 200,
      headers: {
        'X-Encrypted': 'true',
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        ...options?.headers,
      },
    }
  );
}

// Check if response is encrypted
export function isEncryptedResponse(data: any): boolean {
  return data && data._e === true && data.encrypted && data.iv;
}
