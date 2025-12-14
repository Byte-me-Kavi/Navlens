/**
 * Editor URL Security
 * 
 * Generates and validates signed URLs for the visual editor.
 * Prevents unauthorized access to edit mode.
 */

import { createHmac } from 'crypto';

// SECURITY: Must have a secret configured - no fallback allowed
function getEditorSecret(): string {
    const secret = process.env.NAVLENS_EDITOR_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) {
        throw new Error('NAVLENS_EDITOR_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured');
    }
    return secret;
}

const URL_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a signed editor URL
 */
export function generateEditorUrl(
    siteUrl: string,
    experimentId: string,
    variantId: string
): string {
    const timestamp = Date.now();
    const payload = `${experimentId}:${variantId}:${timestamp}`;

    const signature = createHmac('sha256', getEditorSecret())
        .update(payload)
        .digest('hex')
        .slice(0, 16); // Use first 16 chars for shorter URL

    const url = new URL(siteUrl);
    url.searchParams.set('__navlens_editor', experimentId);
    url.searchParams.set('__variant', variantId);
    url.searchParams.set('__ts', timestamp.toString());
    url.searchParams.set('__sig', signature);

    return url.toString();
}

/**
 * Validate editor URL signature
 */
export function validateEditorSignature(
    experimentId: string,
    variantId: string,
    timestamp: string,
    signature: string
): { valid: boolean; error?: string } {
    // Check timestamp
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) {
        return { valid: false, error: 'Invalid timestamp' };
    }

    const age = Date.now() - ts;
    if (age > URL_EXPIRY_MS) {
        return { valid: false, error: 'URL expired' };
    }

    if (age < 0) {
        return { valid: false, error: 'Invalid timestamp (future)' };
    }

    // Verify signature
    const payload = `${experimentId}:${variantId}:${timestamp}`;
    const expectedSig = createHmac('sha256', getEditorSecret())
        .update(payload)
        .digest('hex')
        .slice(0, 16);

    if (signature !== expectedSig) {
        return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
}

/**
 * Generate editor URL payload for client-side
 * (Used by dashboard to show to user)
 */
export interface EditorUrlPayload {
    url: string;
    expiresAt: number;
    experimentId: string;
    variantId: string;
}
