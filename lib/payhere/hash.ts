/**
 * PayHere Hash Generation and Verification
 * Based on official PayHere documentation
 */

import crypto from 'crypto';

/**
 * Generate MD5 hash for PayHere payment form
 * Hash format: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase()).toUpperCase()
 * NOTE: recurrence and duration are sent as form params but NOT included in hash
 */
export function generatePayHereHash(
    merchantId: string,
    orderId: string,
    amount: number,
    currency: string,
    merchantSecret: string,
    recurrence?: string,
    duration?: string
): string {
    // Format amount to 2 decimal places without thousand separators
    const amountFormatted = Number(amount).toFixed(2);

    // Step 1: Generate MD5 hash of merchant secret (use as-is, not decoded)
    const merchantSecretHash = crypto
        .createHash('md5')
        .update(merchantSecret)
        .digest('hex')
        .toUpperCase();

    // Step 2: Build hash string - NOTE: recurrence and duration are NOT included
    // Hash = MD5(merchant_id + order_id + amount + currency + MD5(secret))
    const hashString = merchantId + orderId + amountFormatted + currency + merchantSecretHash;

    // Step 3: Generate final hash
    const hash = crypto
        .createHash('md5')
        .update(hashString)
        .digest('hex')
        .toUpperCase();

    console.log('🔐 Hash Generation Debug:', {
        merchantId,
        orderId,
        amount: amountFormatted,
        currency,
        recurrence: recurrence || 'N/A (not in hash)',
        duration: duration || 'N/A (not in hash)',
        merchantSecretHashPreview: merchantSecretHash.substring(0, 8) + '...',
        hashString: hashString.replace(merchantSecretHash, '***SECRET_HASH***'),
        finalHash: hash
    });

    return hash;
}

/**
 * Verify PayHere notification signature
 * Format: MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret).toUpperCase()).toUpperCase()
 */
export function verifyPayHereNotification(
    merchantId: string,
    orderId: string,
    payhereAmount: string,
    payhereCurrency: string,
    statusCode: string,
    md5sig: string,
    merchantSecret: string
): boolean {
    // Step 1: Generate MD5 hash of merchant secret (use as-is, not decoded)
    const merchantSecretHash = crypto
        .createHash('md5')
        .update(merchantSecret)
        .digest('hex')
        .toUpperCase();

    // Step 2: Generate local hash
    const localHash = crypto
        .createHash('md5')
        .update(
            merchantId +
            orderId +
            payhereAmount +
            payhereCurrency +
            statusCode +
            merchantSecretHash
        )
        .digest('hex')
        .toUpperCase();

    // Step 3: Compare with received signature
    return localHash === md5sig.toUpperCase();
}
