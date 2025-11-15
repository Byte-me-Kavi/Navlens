import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function proxy(request: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res });
    
    // Check auth session
    const {
        data: { session },
    } = await supabase.auth.getSession();
    
    const pathname = request.nextUrl.pathname;
    
    // If accessing dashboard without session, redirect to login with error toast
    if (pathname.startsWith('/dashboard') && !session) {
        const redirectUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(redirectUrl);
        // Set a cookie to show error toast on login page
        response.cookies.set('x-toast-message', 'Please log in to access the dashboard', {
            maxAge: 5,
            path: '/',
        });
        return response;
    }
    
    // If logged in and accessing login page, redirect to dashboard with success toast
    if (pathname === '/login' && session) {
        const redirectUrl = new URL('/dashboard', request.url);
        const response = NextResponse.redirect(redirectUrl);
        // Set cookies for success toast
        response.cookies.set('x-login-success', 'true', {
            maxAge: 10,
            path: '/',
            httpOnly: false,
        });
        response.cookies.set('x-user-email', session.user.email || 'user', {
            maxAge: 10,
            path: '/',
            httpOnly: false,
        });
        return response;
    }

    // If logged in and accessing home page, redirect to dashboard with success toast
    if (pathname === '/' && session) {
        const redirectUrl = new URL('/dashboard', request.url);
        const response = NextResponse.redirect(redirectUrl);
        // Set cookies for success toast
        response.cookies.set('x-login-success', 'true', {
            maxAge: 10,
            path: '/',
            httpOnly: false,
        });
        response.cookies.set('x-user-email', session.user.email || 'user', {
            maxAge: 10,
            path: '/',
            httpOnly: false,
        });
        return response;
    }
    
    return res;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
