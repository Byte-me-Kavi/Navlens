/**
 * PayHere Payment Gateway TypeScript Types
 * Official PayHere API Reference: https://support.payhere.lk/api-&-mobile-sdk/payhere-recurring
 */

export interface PayHereConfig {
    merchantId: string;
    merchantSecret: string;
    mode: 'sandbox' | 'live';
}

export interface PayHereCustomer {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
}

// NOTE: Supports both recurring (PayHere Pro) and one-time (PayHere Lite) payments
// For one-time payments, set recurrence and duration to empty strings
export interface RecurringPaymentRequest {
    orderId: string;
    items: string; // Description of the subscription
    currency: 'USD' | 'LKR' | 'GBP' | 'EUR' | 'AUD';
    amount: number;
    recurrence: '1 Month' | '1 Year' | ''; // Empty for one-time payment (PayHere Lite)
    duration: 'Forever' | string | ''; // Empty for one-time payment (PayHere Lite)
    customer: PayHereCustomer;
    returnUrl: string;
    cancelUrl: string;
    notifyUrl: string;
    custom1?: string; // User ID
    custom2?: string; // Plan ID
}

export interface PayHereNotification {
    merchant_id: string;
    order_id: string;
    payment_id: string;
    subscription_id?: string; // Only for recurring payments
    payhere_amount: string;
    payhere_currency: string;
    status_code: string; // '2' = success, '0' = pending, '-1'/'-2'/'-3' = failed/cancelled
    md5sig: string; // Security signature for verification
    custom_1?: string;
    custom_2?: string;
    method?: string; // Payment method used
    card_holder_name?: string;
    card_no?: string; // Last 4 digits
}

export interface PayHereStatusCode {
    code: string;
    meaning: string;
}

export const PAYHERE_STATUS_CODES: Record<string, string> = {
    '2': 'Success',
    '0': 'Pending',
    '-1': 'Cancelled',
    '-2': 'Failed',
    '-3': 'Chargedback',
};

export interface SubscriptionPlan {
    id: string;
    name: 'Free' | 'Starter' | 'Pro' | 'Enterprise';
    price_usd: number;
    price_lkr: number;
    session_limit: number | null;
    features: Record<string, unknown>;
}
