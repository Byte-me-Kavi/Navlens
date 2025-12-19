/**
 * PayHere Credentials Test Script
 * Run with: npx ts-node scripts/test-payhere.ts
 */

import crypto from 'crypto';

// Load environment variables
const merchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID;
const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
const mode = process.env.NEXT_PUBLIC_PAYHERE_MODE;

console.log('🔍 PayHere Configuration Test\n');
console.log('='.repeat(60));

// 1. Check if credentials are loaded
console.log('\n📋 Step 1: Environment Variables');
console.log('   Merchant ID:', merchantId || '❌ MISSING');
console.log('   Merchant ID Length:', merchantId?.length || 0);
console.log('   Merchant Secret:', merchantSecret ? '✅ Present' : '❌ MISSING');
console.log('   Merchant Secret Length:', merchantSecret?.length || 0);
console.log('   Secret Preview:', merchantSecret ? `${merchantSecret.substring(0, 8)}...${merchantSecret.substring(merchantSecret.length - 8)}` : 'N/A');
console.log('   Mode:', mode || '❌ MISSING');

// 2. Test hash generation
console.log('\n🔐 Step 2: Hash Generation Test');

const testOrderId = 'TEST-ORDER-123';
const testAmount = 10.00;
const testCurrency = 'USD';
const testRecurrence = '1 Month';
const testDuration = 'Forever';

if (merchantId && merchantSecret) {
    // Generate hash for recurring payment
    const amountFormatted = testAmount.toFixed(2);

    const merchantSecretHash = crypto
        .createHash('md5')
        .update(merchantSecret)
        .digest('hex')
        .toUpperCase();

    const hashString = merchantId + testOrderId + amountFormatted + testCurrency + testRecurrence + testDuration + merchantSecretHash;

    const hash = crypto
        .createHash('md5')
        .update(hashString)
        .digest('hex')
        .toUpperCase();

    console.log('   Test Parameters:');
    console.log('     - Order ID:', testOrderId);
    console.log('     - Amount:', amountFormatted);
    console.log('     - Currency:', testCurrency);
    console.log('     - Recurrence:', testRecurrence);
    console.log('     - Duration:', testDuration);
    console.log('\n   Hash Components:');
    console.log('     - Merchant Secret MD5:', merchantSecretHash);
    console.log('     - Hash String:', hashString.replace(merchantSecretHash, '***SECRET***'));
    console.log('     - Final Hash:', hash);
} else {
    console.log('   ❌ Cannot test hash - missing credentials');
}

// 3. Check PayHere endpoint
console.log('\n🌐 Step 3: PayHere Endpoint');
const endpoint = mode === 'sandbox'
    ? 'https://sandbox.payhere.lk/pay/checkout'
    : 'https://www.payhere.lk/pay/checkout';
console.log('   Endpoint URL:', endpoint);
console.log('   Mode:', mode === 'sandbox' ? '🏗️  Sandbox (Test)' : '🚀 Live (Production)');

// 4. Common issues checklist
console.log('\n✅ Common Issues Checklist:');
console.log('   [ ] Merchant ID is exactly as shown in PayHere dashboard');
console.log('   [ ] Merchant Secret is exactly as shown in PayHere dashboard');
console.log('   [ ] Using sandbox credentials with sandbox mode');
console.log('   [ ] Currency (USD/LKR) is enabled in your PayHere account');
console.log('   [ ] Recurring payments are enabled in your account');
console.log('   [ ] Account is activated and not in suspended status');

console.log('\n' + '='.repeat(60));
console.log('\n💡 Next Steps:');
console.log('   1. Verify credentials match your PayHere dashboard exactly');
console.log('   2. Ensure your PayHere account supports recurring payments');
console.log('   3. Check that USD is enabled (or switch to LKR)');
console.log('   4. Verify account status in PayHere dashboard');
console.log('\n');
