
import { NextResponse } from 'next/server';
import { AdminSecurityService } from '@/lib/admin-security';
import { headers } from 'next/headers';

export async function GET(_req: Request) {
    try {
        const headersList = await headers();
        const forwardedFor = headersList.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

        const access = AdminSecurityService.checkAccess(ip);

        // If blocked, we might want to return 403 or just 200 with blocked: true
        // Returning 200 with state is easier for the frontend to handle gracefully without global error handlers interfering
        return NextResponse.json({
            blocked: !access.allowed,
            remainingAttempts: access.remainingAttempts
        });

    } catch {
        // console.error('Status check error:', e);
        return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
    }
}
