/**
 * PayHere Client Library
 * Handles PayHere payment gateway integration for recurring subscriptions
 */

import { generatePayHereHash } from './hash';
import type { PayHereConfig, RecurringPaymentRequest } from './types';

export class PayHereClient {
    private config: PayHereConfig;

    constructor() {
        this.config = {
            merchantId: process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID!,
            merchantSecret: process.env.PAYHERE_MERCHANT_SECRET!,
            mode: (process.env.NEXT_PUBLIC_PAYHERE_MODE as 'sandbox' | 'live') || 'sandbox',
        };

        console.log('🔐 PayHere Client Config:', {
            merchantId: this.config.merchantId,
            merchantSecretLength: this.config.merchantSecret?.length || 0,
            mode: this.config.mode,
        });

        if (!this.config.merchantId || !this.config.merchantSecret) {
            throw new Error('PayHere merchant credentials not configured');
        }
    }

    /**
     * Get PayHere checkout URL based on mode (sandbox/live)
     */
    getCheckoutUrl(): string {
        return this.config.mode === 'sandbox'
            ? 'https://sandbox.payhere.lk/pay/checkout'
            : 'https://www.payhere.lk/pay/checkout';
    }

    /**
     * Generate HTML form for PayHere recurring payment
     * This form should be auto-submitted to redirect user to PayHere
     */
    createRecurringPaymentForm(request: RecurringPaymentRequest): string {
        const hash = generatePayHereHash(
            this.config.merchantId,
            request.orderId,
            request.amount,
            request.currency,
            this.config.merchantSecret,
            request.recurrence,  // Add recurrence for recurring payment hash
            request.duration     // Add duration for recurring payment hash
        );

        // DEBUG: Log hash generation details
        console.log('🔐 PayHere Hash Debug:', {
            merchantId: this.config.merchantId,
            merchantIdLength: this.config.merchantId?.length,
            orderId: request.orderId,
            amount: request.amount.toFixed(2),
            currency: request.currency,
            merchantSecretLength: this.config.merchantSecret?.length,
            merchantSecretPreview: this.config.merchantSecret ? `${this.config.merchantSecret.substring(0, 4)}...${this.config.merchantSecret.substring(this.config.merchantSecret.length - 4)}` : 'MISSING',
            generatedHash: hash,
        });

        const formFields = [
            { name: 'merchant_id', value: this.config.merchantId },
            { name: 'return_url', value: request.returnUrl },
            { name: 'cancel_url', value: request.cancelUrl },
            { name: 'notify_url', value: request.notifyUrl },
            { name: 'first_name', value: request.customer.firstName },
            { name: 'last_name', value: request.customer.lastName },
            { name: 'email', value: request.customer.email },
            { name: 'phone', value: request.customer.phone },
            { name: 'address', value: request.customer.address },
            { name: 'city', value: request.customer.city },
            { name: 'country', value: request.customer.country },
            { name: 'order_id', value: request.orderId },
            { name: 'items', value: request.items },
            { name: 'currency', value: request.currency },
            { name: 'amount', value: request.amount.toFixed(2) },
            { name: 'recurrence', value: request.recurrence },
            { name: 'duration', value: request.duration },
            { name: 'hash', value: hash },
        ];

        // DEBUG: Log all form fields
        console.log('📋 PayHere Form Fields:', formFields);

        // Add custom fields if provided
        if (request.custom1) {
            formFields.push({ name: 'custom_1', value: request.custom1 });
        }
        if (request.custom2) {
            formFields.push({ name: 'custom_2', value: request.custom2 });
        }

        // Generate HTML form
        const formInputs = formFields
            .map(field => `    <input type="hidden" name="${field.name}" value="${this.escapeHtml(field.value)}">`)
            .join('\n');

        return `
<form method="post" action="${this.getCheckoutUrl()}" id="payhere-payment-form">
${formInputs}
</form>
<script>
  document.getElementById('payhere-payment-form').submit();
</script>
    `.trim();
    }

    /**
     * Create payment request object for a subscription plan
     */
    createSubscriptionPaymentRequest(
        planName: string,
        priceUsd: number,
        priceLkr: number,
        currency: 'USD' | 'LKR',
        userId: string,
        planId: string,
        customer: RecurringPaymentRequest['customer'],
        baseUrl: string
    ): RecurringPaymentRequest {
        const orderId = this.generateOrderId(userId);
        const amount = currency === 'USD' ? priceUsd : priceLkr;

        return {
            orderId,
            items: `Navlens ${planName} Plan - Monthly Subscription`,
            currency,
            amount,
            recurrence: '1 Month',
            duration: 'Forever',
            customer,
            returnUrl: `${baseUrl}/dashboard/subscription/success`,
            cancelUrl: `${baseUrl}/pricing?cancelled=true`,
            notifyUrl: `${baseUrl}/api/payhere/notify`,
            custom1: userId,
            custom2: planId,
        };
    }

    /**
     * Generate unique order ID
     */
    private generateOrderId(userId: string): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `SUB-${userId.substring(0, 8)}-${timestamp}-${random}`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml(unsafe: string): string {
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
