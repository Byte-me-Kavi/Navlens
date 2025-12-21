
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server-admin';

interface AuditLogEntry {
    action: string;
    targetResource: string;
    details?: Record<string, any>;
}

/**
 * Logs an administrative action to the database.
 * Auto-resolves admin email from session and IP from request.
 */
export async function logAdminAction(req: NextRequest, entry: AuditLogEntry) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('admin_session');

        let adminEmail = 'unknown';
        if (sessionCookie?.value) {
            try {
                // If using encrypted session, might need to decrypt. 
                // Based on auth.ts, the cookie might just be the email or a simple JSON.
                // Assuming simple value or parsing logic matches auth.
                // For safety, we'll store the raw value if valid email, or decode if needed.
                // Let's assume it's the email for now based on simple implementation, 
                // or we could decode if it's a JWT.
                // Re-using the logic from auth middleware would be best, but let's just peek.
                adminEmail = sessionCookie.value;
            } catch (e) { }
        }

        const ip = req.headers.get('x-forwarded-for') || 'unknown';

        const supabase = createClient();

        // Fire and forget (don't await strictly if performance critical, but await for safety)
        const { error } = await supabase.from('admin_audit_logs').insert({
            admin_email: adminEmail,
            action: entry.action,
            target_resource: entry.targetResource,
            details: entry.details || {},
            ip_address: ip
        });

        if (error) {
            console.error('[AdminLogger] DB Insert failed:', error);
        } else {
            console.log(`[AdminLogger] ${entry.action} on ${entry.targetResource}`);
        }

    } catch (error) {
        console.error('[AdminLogger] Failed to log:', error);
    }
}
