
import nodemailer from 'nodemailer';

type IpState = {
    failures: number;
    blocked: boolean;
    blockExpires: number;
    otp?: string;
    otpExpires?: number;
};


// In-memory store for rate limiting
// Using globalThis to persist across hot reloads in development
const globalForSecurity = global as unknown as { ipStore: Map<string, IpState> };
const ipStore = globalForSecurity.ipStore || new Map<string, IpState>();

if (process.env.NODE_ENV !== 'production') globalForSecurity.ipStore = ipStore;


const MAX_FAILURES = 1; // Strict 1-strike rule
const BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const OTP_DURATION = 5 * 60 * 1000; // 5 minutes

export class AdminSecurityService {

    static getIpState(ip: string): IpState {
        const now = Date.now();
        let state = ipStore.get(ip);

        // Clean up expired blocks if no OTP is pending
        if (state && state.blocked && now > state.blockExpires && !state.otp) {
            ipStore.delete(ip);
            state = undefined;
        }

        if (!state) {
            state = { failures: 0, blocked: false, blockExpires: 0 };
            ipStore.set(ip, state);
        }
        return state;
    }

    static checkAccess(ip: string): { allowed: boolean; remainingAttempts: number; blocked: boolean } {
        const state = this.getIpState(ip);

        if (state.blocked) {
            // Double check expiration explicitly
            if (Date.now() > state.blockExpires) {
                this.reset(ip);
                return { allowed: true, remainingAttempts: MAX_FAILURES, blocked: false };
            }
            return { allowed: false, remainingAttempts: 0, blocked: true };
        }

        return {
            allowed: true,
            remainingAttempts: MAX_FAILURES - state.failures,
            blocked: false
        };
    }

    static recordFailure(ip: string): { blocked: boolean } {
        const state = this.getIpState(ip);
        state.failures += 1;

        if (state.failures >= MAX_FAILURES) {
            state.blocked = true;
            state.blockExpires = Date.now() + BLOCK_DURATION;
            // We do NOT generate OTP automatically; user must request it to avoid spam.
        }

        ipStore.set(ip, state);
        return { blocked: state.blocked };
    }

    static reset(ip: string) {
        ipStore.delete(ip);
    }

    // --- OTP Logic ---

    static async generateUnlockOtp(ip: string): Promise<boolean> {
        const state = this.getIpState(ip);
        if (!state.blocked) return false; // Don't generate OTP if not blocked

        // Generate 6-digit numeric OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        state.otp = otp;
        state.otpExpires = Date.now() + OTP_DURATION;

        ipStore.set(ip, state);

        // --- EMAIL OTP DELIVERY ---
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD
                }
            });

            const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_EMAIL;

            await transporter.sendMail({
                from: `"NavLens Security" <${process.env.SMTP_EMAIL}>`,
                to: adminEmail,
                subject: '🔐 Admin Unlock OTP',
                html: `
                    <div style="font-family: sans-serif; padding: 20px; background: #f4f4f5;">
                        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <h2 style="color: #18181b; margin-top: 0;">Security Alert</h2>
                            <p style="color: #52525b;">Your admin IP address <strong>${ip}</strong> was blocked due to multiple failed login attempts.</p>
                            <p style="color: #52525b;">Use the code below to unlock access:</p>
                            <div style="background: #eff6ff; color: #2563eb; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
                                ${otp}
                            </div>
                            <p style="color: #71717a; font-size: 12px;">If you did not request this, please verify your server security immediately.</p>
                        </div>
                    </div>
                `
            });
            console.log(`[AdminSecurity] OTP sent to ${adminEmail}`);
            return true;
        } catch (error) {
            console.error('[AdminSecurity] Failed to send OTP email:', error);
            return false;
        }
    }

    static verifyOther(ip: string, code: string): boolean {
        // Basic check
        const state = this.getIpState(ip);
        if (!state.blocked || !state.otp) return false;

        if (Date.now() > (state.otpExpires || 0)) {
            state.otp = undefined; // Expired
            return false;
        }

        if (state.otp === code) {
            // Success! Unblock.
            this.reset(ip);
            return true;
        }
        return false;
    }
}
