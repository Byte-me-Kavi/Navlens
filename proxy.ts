import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// A/B Testing Constants
const VISITOR_COOKIE = 'navlens_visitor';
const EXPERIMENTS_COOKIE = 'navlens_ab_assignments';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const SUBSCRIPTION_CACHE_COOKIE = 'navlens_sub_status';

import { encryptEdge, decryptEdge } from '@/lib/edge-crypto';

/**
 * Generate UUID v4 for visitor ID
 */
function generateVisitorId(): string {
    // Use crypto.randomUUID if available (Edge runtime supports it)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Parse JSON safely
 */
function safeJsonParse<T>(str: string | undefined, fallback: T): T {
    if (!str) return fallback;
    try {
        return JSON.parse(str) as T;
    } catch {
        return fallback;
    }
}

export default async function middleware(request: NextRequest) {
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const pathname = request.nextUrl.pathname;

    // ============================================
    // A/B TESTING: VISITOR ID MANAGEMENT
    // ============================================
    // Skip for API routes and static assets
    if (!pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.includes('.')) {
        let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
        let isNewVisitor = false;

        if (!visitorId) {
            visitorId = generateVisitorId();
            isNewVisitor = true;

            response.cookies.set(VISITOR_COOKIE, visitorId, {
                maxAge: COOKIE_MAX_AGE,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            });
        }

        // Get existing experiment assignments from cookie
        const existingAssignments = safeJsonParse<Record<string, string>>(
            request.cookies.get(EXPERIMENTS_COOKIE)?.value,
            {}
        );

        // Inject context for client-side hydration via headers
        if (Object.keys(existingAssignments).length > 0) {
            response.headers.set('x-navlens-experiments', JSON.stringify(existingAssignments));
        }

        // Set visitor ID header for client-side access
        response.headers.set('x-navlens-visitor', visitorId);
        response.headers.set('x-navlens-new-visitor', isNewVisitor ? '1' : '0');
    }

    // ============================================
    // AUTHENTICATION
    // ============================================
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    const searchParams = request.nextUrl.searchParams;

    // CRITICAL: Allow OAuth callback to be processed by Auth UI - don't redirect yet
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const hasAuthParams = code || state;

    if (hasAuthParams) {
        // Let Auth UI component handle the OAuth callback
        return response;
    }

    // Check auth session AFTER OAuth params check
    // Check auth session AFTER OAuth params check
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (pathname.startsWith('/dashboard') && !user) {
        const redirectUrl = new URL('/login', request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        redirectResponse.cookies.set('x-toast-message', 'Please log in to access the dashboard', {
            maxAge: 5,
            path: '/',
        });
        return redirectResponse;
    }

    // If logged in and accessing login page, let client-side handle the redirect
    // This avoids conflicts with OAuth callback flow
    if (pathname === '/login' && user && !hasAuthParams) {
        // Client-side redirect will be handled by login page component
        // Don't redirect from middleware to avoid race conditions
        return response;
    }

    // ============================================
    // FREE TIER ENFORCEMENT (15 DAYS)
    // ============================================
    if (user && pathname.startsWith('/dashboard') && pathname !== '/dashboard/account') {
        try {
            // Check if user is older than 15 days
            const createdAt = new Date(user.created_at);
            const now = new Date();
            const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

            if (daysSinceSignup > 15) {
                // Check cached subscription status
                const cachedSubStatus = request.cookies.get(SUBSCRIPTION_CACHE_COOKIE)?.value;
                let isCachedValid = false;
                let isCachedBlocked = false;

                if (cachedSubStatus) {
                    const decrypted = await decryptEdge<{ valid: boolean, expiresAt: number }>(cachedSubStatus);
                    if (decrypted && decrypted.expiresAt > Date.now()) {
                        if (decrypted.valid) {
                            isCachedValid = true;
                        } else {
                            isCachedBlocked = true;
                        }
                    }
                }

                if (isCachedValid) {
                    // Subscription is valid content access granted
                } else if (!isCachedBlocked) {
                    // Check for ANY paid subscription (active, trialing, OR cancelled-but-still-valid)
                    // fetches plan name and price to identify free tier dynamically (price: 0)
                    const { data: subscriptions } = await supabase
                        .from('subscriptions')
                        .select('status, plan_id, cancel_at_period_end, current_period_end, subscription_plans!inner(name, price_usd)')
                        .eq('user_id', user.id)
                        .order('current_period_end', { ascending: false });

                    let hasActivePaidSub = false;

                    if (subscriptions && subscriptions.length > 0) {
                        // Check if ANY subscription is valid AND NOT Free
                        hasActivePaidSub = subscriptions.some((sub: any) => {
                            // Skip Free plan (price is 0)
                            // We use price_usd as a reliable indicator of "Free" vs "Paid"
                            // Using name is fragile if it changes to "Free Tier" etc.
                            const price = sub.subscription_plans?.price_usd;
                            if (price === 0 || price === '0.00' || price === 0.00) return false;

                            const now = new Date();
                            // Handle null dates safely
                            if (!sub.current_period_end) return false;

                            const periodEnd = new Date(sub.current_period_end);

                            // Valid if:
                            // 1. Status is active/trialing
                            // 2. OR Status is cancelled but period hasn't ended yet
                            const isActiveStatus = ['active', 'trialing'].includes(sub.status);
                            const isWithinPeriod = periodEnd > now;

                            return isActiveStatus || isWithinPeriod;
                        });
                    }

                    // CACHE THE RESULT
                    // Valid: Cache for 6 hours
                    // Invalid: Cache for 2 minutes (to allow quick retry after payment)
                    const cacheDuration = hasActivePaidSub ? 6 * 60 * 60 * 1000 : 2 * 60 * 1000;
                    const encryptedStatus = await encryptEdge({
                        valid: hasActivePaidSub,
                        expiresAt: Date.now() + cacheDuration
                    });

                    response.cookies.set(SUBSCRIPTION_CACHE_COOKIE, encryptedStatus, {
                        maxAge: hasActivePaidSub ? 6 * 60 * 60 : 120, // seconds
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                    });

                    // If no active paid sub, BLOCKED
                    if (!hasActivePaidSub) {
                        const redirectUrl = new URL('/dashboard/account', request.url);
                        // Add query params
                        redirectUrl.searchParams.set('tab', 'billing');
                        if (!request.nextUrl.searchParams.has('error')) {
                            redirectUrl.searchParams.set('error', 'trial_expired');
                        }

                        const redirectResponse = NextResponse.redirect(redirectUrl);

                        // Set toast cookie
                        redirectResponse.cookies.set('x-toast-message', 'Your 15-day Free Trial has ended. Please upgrade to continue.', {
                            maxAge: 5,
                            path: '/',
                        });

                        return redirectResponse;
                    }
                } else {
                    // Logic flow: isCachedBlocked is true, meaning we confirmed they were blocked recently
                    // Re-block without DB call
                    // Same block logic as above
                    const redirectUrl = new URL('/dashboard/account', request.url);
                    redirectUrl.searchParams.set('tab', 'billing');
                    if (!request.nextUrl.searchParams.has('error')) {
                        redirectUrl.searchParams.set('error', 'trial_expired');
                    }
                    const redirectResponse = NextResponse.redirect(redirectUrl);
                    redirectResponse.cookies.set('x-toast-message', 'Your 15-day Free Trial has ended. Please upgrade to continue.', { maxAge: 5, path: '/' });
                    return redirectResponse;
                }
            }
        } catch (err) {
            console.error('Middleware/Proxy enforcement error:', err);
            // Fail open (allow access) on error to prevent total lockout if DB fails
        }
    }

    // If logged in and accessing home page, redirect to dashboard with success toast
    // Triggered when user clicks sign in button or comes from login flow
    const signInClicked = searchParams.get('signin') === 'true' || request.cookies.get('x-signin-clicked')?.value === 'true';
    if (pathname === '/' && user && signInClicked) {
        const redirectUrl = new URL('/dashboard', request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        // Only set toast cookies on actual redirect, not on every access
        const hasShownToast = request.cookies.get('x-login-success');
        if (!hasShownToast) {
            redirectResponse.cookies.set('x-login-success', 'true', {
                maxAge: 5,
                path: '/',
                httpOnly: false,
            });
            redirectResponse.cookies.set('x-user-email', user.email || 'user', {
                maxAge: 5,
                path: '/',
                httpOnly: false,
            });
        }
        return redirectResponse;
    }

    // Allow unauthenticated users to access home page (landing page)
    if (pathname === '/' && !user) {
        return response;
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
