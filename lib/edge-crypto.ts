
/**
 * Edge-compatible Crypto Utilities
 * 
 * Safe for use in Next.js Middleware (Edge Runtime).
 * Does NOT use 'crypto' module, only globalThis.crypto (Web Crypto API).
 */

const SECRET_KEY = process.env.ADMIN_SESSION_SECRET || process.env.NEXT_PUBLIC_ADMIN_ENC_KEY || '';

// Fallback key generation if env var is missing (just to prevent crash, but won't persist across restarts if random)
// In production, user MUST set ADMIN_SESSION_SECRET
async function getSecretKeyMaterial(): Promise<Uint8Array> {
    if (SECRET_KEY && SECRET_KEY.length >= 32) {
        // Use provided key (hex or raw string)
        if (SECRET_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(SECRET_KEY)) {
            // Hex string
            const bytes = new Uint8Array(SECRET_KEY.length / 2);
            for (let i = 0; i < SECRET_KEY.length; i += 2) {
                bytes[i / 2] = parseInt(SECRET_KEY.substring(i, i + 2), 16);
            }
            return bytes;
        }
        return new TextEncoder().encode(SECRET_KEY).slice(0, 32);
    }

    // Warn if falling back to insecure or public key wasn't strong enough
    if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SESSION_SECRET) {
        console.warn('EdgeCrypto: ADMIN_SESSION_SECRET is invalid or missing in production! System is using fallback/public key.');
    }

    // Very basic fallback - insecure but functional for dev without keys
    return new TextEncoder().encode('fallback_secret_key_32_bytes_long!!');
}

async function getCryptoKey(usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
    const keyMaterial = await getSecretKeyMaterial();
    return globalThis.crypto.subtle.importKey(
        'raw',
        keyMaterial as unknown as BufferSource,
        { name: 'AES-GCM' },
        false,
        [usage]
    );
}

// Uint8Array to Hex
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// Hex to Uint8Array
function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptEdge(data: unknown): Promise<string> {
    const json = JSON.stringify(data);
    const encoded = new TextEncoder().encode(json);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await getCryptoKey('encrypt');

    const encryptedContent = await globalThis.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key,
        encoded
    );

    return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(encryptedContent))}`;
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptEdge<T = unknown>(ciphertext: string): Promise<T | null> {
    try {
        const [ivHex, dataHex] = ciphertext.split(':');
        if (!ivHex || !dataHex) return null;

        const iv = hexToBytes(ivHex);
        const data = hexToBytes(dataHex);
        const key = await getCryptoKey('decrypt');

        const decryptedContent = await globalThis.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv as unknown as BufferSource },
            key,
            data as unknown as BufferSource
        );

        const decoded = new TextDecoder().decode(decryptedContent);
        return JSON.parse(decoded) as T;
    } catch (e) {
        console.error('EdgeCrypto: Decryption failed', e);
        return null;
    }
}
