
const SECRET_KEY = process.env.NEXT_PUBLIC_ADMIN_ENC_KEY || '';

if (!SECRET_KEY || SECRET_KEY.length !== 64) {
    console.warn('Crypto: Invalid or missing NEXT_PUBLIC_ADMIN_ENC_KEY. Shared key must be 64 hex characters (32 bytes).');
}

// Helper: Hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

// Helper: Uint8Array to Hex string
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function getCrypto() {
    if (typeof globalThis.crypto !== 'undefined') {
        return globalThis.crypto;
    }
    // Fallback for older Node.js environments
    try {
        return require('node:crypto').webcrypto;
    } catch (e) {
        throw new Error('Web Crypto API not available');
    }
}

async function getKey(usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
    const crypto = getCrypto();
    return crypto.subtle.importKey(
        'raw',
        hexToBytes(SECRET_KEY),
        { name: 'AES-GCM' },
        false,
        [usage]
    );
}

/**
 * Encrypts a JSON-serializable payload using AES-GCM.
 * Returns a string in format "IV_HEX:CIPHERTEXT_HEX"
 */
export async function encryptData(data: any): Promise<string> {
    const crypto = getCrypto();
    const json = JSON.stringify(data);
    const encoded = new TextEncoder().encode(json);

    // 96-bit IV (12 bytes) is standard for GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await getKey('encrypt');

    const encryptedParams = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );

    return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(encryptedParams))}`;
}

/**
 * Decrypts a string in format "IV_HEX:CIPHERTEXT_HEX".
 * Returns the parsed JSON object.
 */
export async function decryptData<T = any>(ciphertext: string): Promise<T> {
    const crypto = getCrypto();
    const [ivHex, dataHex] = ciphertext.split(':');

    if (!ivHex || !dataHex) {
        throw new Error('Invalid ciphertext format');
    }

    const iv = hexToBytes(ivHex);
    const data = hexToBytes(dataHex);

    const key = await getKey('decrypt');

    try {
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        const decoded = new TextDecoder().decode(decryptedBuffer);
        return JSON.parse(decoded);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Decryption failed');
    }
}
