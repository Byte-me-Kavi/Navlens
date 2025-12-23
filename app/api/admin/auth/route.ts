import { NextResponse } from 'next/server';
import { decryptData, encryptData } from '@/lib/crypto';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { AdminSecurityService } from '@/lib/admin-security';

export async function POST(req: Request) {
    try {
        const headersList = await headers();
        // Get real IP from headers (x-forwarded-for) or fallback
        const forwardedFor = headersList.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

        // 1. Check Rate Limit Access
        const access = AdminSecurityService.checkAccess(ip);

        if (!access.allowed) {
            return NextResponse.json({
                error: 'Access blocked due to failed attempts.',
                blocked: true
            }, { status: 403 });
        }

        const body = await req.json();
        const { payload } = body;

        if (!payload) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Decrypt the payload
        let data;
        try {
            data = await decryptData(payload);
        } catch (e) {
            console.error('Decryption error:', e);
            return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
        }

        const { email, password } = data as { email?: string; password?: string };

        // Get credentials from environment
        const validEmail = process.env.ADMIN_EMAIL;
        const validPass = process.env.ADMIN_PASSWORD;

        if (!validEmail || !validPass) {
            console.error("Admin credentials not set in env (ADMIN_EMAIL, ADMIN_PASSWORD)");
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        if (email === validEmail && password === validPass) {
            // Success: Reset rate limit counters for this IP
            AdminSecurityService.reset(ip);

            // Set secure session cookie
            const cookieStore = await cookies();
            cookieStore.set('admin_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: 60 * 60 * 24, // 1 day
                sameSite: 'strict'
            });

            // Return encrypted success message
            const responseData = { success: true, redirectUrl: '/admin/dashboard' };
            const encryptedResponse = await encryptData(responseData);

            return NextResponse.json({ encryptedResponse });
        }

        // 2. Record Failure on Invalid Credentials
        const result = AdminSecurityService.recordFailure(ip);

        if (result.blocked) {
            // Trigger Email OTP if just blocked
            await AdminSecurityService.generateUnlockOtp(ip);

            return NextResponse.json({
                error: 'Access Blocked.',
                blocked: true
            }, { status: 403 });
        }

        return NextResponse.json({
            error: 'Invalid credentials. Only 1 attempt allowed.',
            remainingAttempts: 0
        }, { status: 401 });

    } catch (e) {
        console.error('Auth handler error:', e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
