
import { NextResponse } from 'next/server';
import { AdminSecurityService } from '@/lib/admin-security';
import { headers } from 'next/headers';

export async function POST(req: Request) {
    try {
        const headersList = await headers();
        const forwardedFor = headersList.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

        const body = await req.json();
        const { otp } = body;

        if (!otp) {
            return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
        }

        const unlocked = AdminSecurityService.verifyOther(ip, otp);

        if (unlocked) {
            return NextResponse.json({ success: true, message: 'Access restored. Please login.' });
        } else {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

    } catch (e) {
        console.error('Unlock error:', e);
        return NextResponse.json({ error: 'Unlock failed' }, { status: 500 });
    }
}
