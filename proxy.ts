import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export default async function proxy(request: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res });
    
    // Check auth session
    const {
        data: { session },
    } = await supabase.auth.getSession();
    
    // If accessing dashboard without session, redirect to login with toast
    if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
        const redirectUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(redirectUrl);
        // Set a cookie to show toast on login page
        response.cookies.set('x-toast-message', 'Please log in to access the dashboard', {
            maxAge: 5, // 5 seconds
            path: '/',
        });
        return response;
    }
    
    // If logged in and accessing login page, redirect to dashboard
    if (request.nextUrl.pathname === '/login' && session) {
        const redirectUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(redirectUrl);
    }
    
    return res;
}
