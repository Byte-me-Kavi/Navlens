import nodemailer from 'nodemailer';

// --- Configuration ---
const SMTP_EMAIL = process.env.SMTP_EMAIL || 'navlensanalytics@gmail.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD; // User said they added this

if (!SMTP_PASSWORD) {
    console.warn('⚠️ SMTP_PASSWORD is not set. Emails will not be sent.');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
    },
});

// --- Templates ---

const STYLES = `
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #374151;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
`;

const HEADER = `
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4F46E5; margin: 0;">Navlens Analytics</h1>
    </div>
`;

const FOOTER = `
    <div style="margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center; font-size: 12px; color: #6B7280;">
        <p>&copy; ${new Date().getFullYear()} Navlens Analytics. All rights reserved.</p>
        <p>Questions? Reply to this email.</p>
    </div>
`;

/**
 * Send a generic email
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (!SMTP_PASSWORD) {
        console.log(`[Mock Email] To: ${to}, Subject: ${subject}`);
        return false;
    }

    try {
        await transporter.sendMail({
            from: `"Navlens Analytics" <${SMTP_EMAIL}>`,
            to,
            subject,
            html: `
                <div style="${STYLES}">
                    ${HEADER}
                    ${html}
                    ${FOOTER}
                </div>
            `,
        });
        console.log(`📧 Email sent to ${to}: ${subject}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        return false;
    }
}

// --- Specific Emails ---

export async function sendWelcomeEmail(email: string, name: string = 'Creator') {
    return sendEmail({
        to: email,
        subject: 'Welcome to Navlens Analytics! 🚀',
        html: `
            <h2>Hi ${name},</h2>
            <p>Welcome to Navlens Analytics! We're thrilled to have you on board.</p>
            <p>You're currently on our <strong>Free Tier</strong>, which gives you access to core analytics for <strong>30 days</strong>.</p>
            <p>Start by installing the tracking code on your website to verify your data.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Go to Dashboard</a>
            </div>
        `
    });
}

export async function sendSubscriptionActiveEmail(email: string, planName: string) {
    return sendEmail({
        to: email,
        subject: `You've upgraded to ${planName}! 🎉`,
        html: `
            <h2>Your subscription is active!</h2>
            <p>Thank you for upgrading to the <strong>${planName} Plan</strong>.</p>
            <p>You now have access to:</p>
            <ul>
                <li>Higher session limits</li>
                <li>Unlimited heatmaps (if applicable)</li>
                <li>Extended data retention</li>
            </ul>
            <p>Your invoice is available in your account settings.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account" style="background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Account</a>
            </div>
        `
    });
}

export async function sendSubscriptionCancelledEmail(email: string) {
    return sendEmail({
        to: email,
        subject: 'Subscription Cancellation Scheduled',
        html: `
            <h2>Subscription Update</h2>
            <p>We've received your request to cancel your subscription.</p>
            <p><strong>You still have access</strong> to your premium features until the end of your current billing period.</p>
            <p>After that, your account will revert to the Free Tier (subject to the 30-day limit).</p>
            <p>We're sorry to see you go! If there's anything we could have done better, please let us know.</p>
        `
    });
}

export async function sendTrialExpiredEmail(email: string) {
    return sendEmail({
        to: email,
        subject: 'Your Free Trial has Expired ⏳',
        html: `
            <h2 style="color: #DC2626;">Trial Expired</h2>
            <p>Your 30-day access to the Free Tier has ended.</p>
            <p>To continue tracking your users and viewing heatmaps, please upgrade to a paid plan.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account" style="background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Upgrade Now</a>
            </div>
        `
    });
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
    return sendEmail({
        to: email,
        subject: 'Reset Your Password 🔒',
        html: `
            <h2>Password Reset Request</h2>
            <p>We received a request to reset the password for your account.</p>
            <p>Click the button below to choose a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #6B7280;">Link expires in 24 hours. If you didn't request this, please ignore this email.</p>
        `
    });
}
