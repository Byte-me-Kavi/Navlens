import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export default async function middleware(request: NextRequest) {
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

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

    const pathname = request.nextUrl.pathname;
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
    const {
        data: { session },
    } = await supabase.auth.getSession();
    
    if (pathname.startsWith('/dashboard') && !session) {
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
    if (pathname === '/login' && session && !hasAuthParams) {
        // Client-side redirect will be handled by login page component
        // Don't redirect from middleware to avoid race conditions
        return response;
    }

    // If logged in and accessing home page, redirect to dashboard with success toast
    // Triggered when user clicks sign in button or comes from login flow
    const signInClicked = searchParams.get('signin') === 'true' || request.cookies.get('x-signin-clicked')?.value === 'true';
    if (pathname === '/' && session && signInClicked) {
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
            redirectResponse.cookies.set('x-user-email', session.user.email || 'user', {
                maxAge: 5,
                path: '/',
                httpOnly: false,
            });
        }
        return redirectResponse;
    }

    // Allow unauthenticated users to access home page (landing page)
    if (pathname === '/' && !session) {
        return response;
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
