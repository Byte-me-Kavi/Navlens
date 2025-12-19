/**
 * Test script to debug PayHere hash generation
 * Run with: node scripts/debug-payhere-hash.mjs
 */

import crypto from 'crypto';

// Your credentials
const MERCHANT_ID = '1233231';
const MERCHANT_SECRET = 'Mzg3OTIwODg4NjM1Njc1MjI3MjgyMzA4ODE5NjUzMzk4MDI1NTE4OA==';

// Test values
const ORDER_ID = 'TEST-ORDER-001';
const AMOUNT = '29.00';
const CURRENCY = 'USD';
const RECURRENCE = '1 Month';
const DURATION = 'Forever';

console.log('=== PayHere Hash Debug ===\n');

// Step 1: MD5 of merchant secret
const secretHash = crypto
    .createHash('md5')
    .update(MERCHANT_SECRET)
    .digest('hex')
    .toUpperCase();

console.log('1. Merchant Secret MD5:', secretHash);

// Step 2: Build hash string for recurring payment
const hashString = MERCHANT_ID + ORDER_ID + AMOUNT + CURRENCY + RECURRENCE + DURATION + secretHash;
console.log('\n2. Hash String (with recurrence):', hashString.replace(secretHash, '[SECRET_HASH]'));

// Step 3: Final hash
const finalHash = crypto
    .createHash('md5')
    .update(hashString)
    .digest('hex')
    .toUpperCase();

console.log('3. Final Hash:', finalHash);

// Let's also try WITHOUT recurrence (one-time payment format)
const hashStringOneTime = MERCHANT_ID + ORDER_ID + AMOUNT + CURRENCY + secretHash;
const finalHashOneTime = crypto
    .createHash('md5')
    .update(hashStringOneTime)
    .digest('hex')
    .toUpperCase();

console.log('\n4. Hash without recurrence/duration:', finalHashOneTime);

console.log('\n=== Form Data to Submit ===');
console.log({
    merchant_id: MERCHANT_ID,
    order_id: ORDER_ID,
    amount: AMOUNT,
    currency: CURRENCY,
    recurrence: RECURRENCE,
    duration: DURATION,
    hash: finalHash,
});

// Check if secret might need base64 decoding
console.log('\n=== Alternative: Base64 Decoded Secret ===');
try {
    const decodedSecret = Buffer.from(MERCHANT_SECRET, 'base64').toString('utf-8');
    console.log('Decoded Secret:', decodedSecret);
    
    const decodedSecretHash = crypto
        .createHash('md5')
        .update(decodedSecret)
        .digest('hex')
        .toUpperCase();
    
    const hashStringDecoded = MERCHANT_ID + ORDER_ID + AMOUNT + CURRENCY + RECURRENCE + DURATION + decodedSecretHash;
    const finalHashDecoded = crypto
        .createHash('md5')
        .update(hashStringDecoded)
        .digest('hex')
        .toUpperCase();
    
    console.log('Hash with decoded secret:', finalHashDecoded);
} catch (e) {
    console.log('Could not decode base64:', e);
}
