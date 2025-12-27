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

// --- Usage Warning Emails ---

export async function sendUsageWarning80Email(email: string, usageType: 'sessions' | 'recordings', current: number, limit: number, planName: string) {
    const percentage = Math.round((current / limit) * 100);
    const usageLabel = usageType === 'sessions' ? 'Sessions' : 'Recordings';

    return sendEmail({
        to: email,
        subject: `⚠️ You've used 80% of your ${usageLabel.toLowerCase()} quota`,
        html: `
            <h2 style="color: #4F46E5;">Usage Alert</h2>
            <p>Hi there,</p>
            <p>You've used <strong>${percentage}%</strong> of your monthly ${usageLabel.toLowerCase()} limit on your <strong>${planName}</strong> plan.</p>
            
            <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #4338CA; font-weight: 600;">${usageLabel} Used</span>
                    <span style="color: #4338CA; font-weight: 700;">${current.toLocaleString()} / ${limit.toLocaleString()}</span>
                </div>
                <div style="background: #C7D2FE; border-radius: 8px; height: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #6366F1 0%, #4F46E5 100%); height: 100%; width: ${percentage}%; border-radius: 8px;"></div>
                </div>
            </div>
            
            <p>To avoid interruption to your analytics tracking, consider upgrading your plan.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Upgrade Plan</a>
            </div>
        `
    });
}

export async function sendUsageWarning90Email(email: string, usageType: 'sessions' | 'recordings', current: number, limit: number, planName: string) {
    const percentage = Math.round((current / limit) * 100);
    const usageLabel = usageType === 'sessions' ? 'Sessions' : 'Recordings';

    return sendEmail({
        to: email,
        subject: `🔶 Critical: 90% of ${usageLabel.toLowerCase()} limit reached`,
        html: `
            <h2 style="color: #D97706;">Almost at Limit!</h2>
            <p>Hi there,</p>
            <p>You've used <strong>${percentage}%</strong> of your monthly ${usageLabel.toLowerCase()} quota on your <strong>${planName}</strong> plan. Your tracking will stop when you hit the limit.</p>
            
            <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border: 2px solid #F59E0B; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #92400E; font-weight: 600;">${usageLabel} Used</span>
                    <span style="color: #92400E; font-weight: 700;">${current.toLocaleString()} / ${limit.toLocaleString()}</span>
                </div>
                <div style="background: #FDE68A; border-radius: 8px; height: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%); height: 100%; width: ${percentage}%; border-radius: 8px;"></div>
                </div>
                <p style="color: #92400E; font-size: 14px; margin: 12px 0 0 0;">⏰ Only ${limit - current} ${usageLabel.toLowerCase()} remaining this month</p>
            </div>
            
            <p><strong>Upgrade now</strong> to continue tracking without interruption.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Upgrade Immediately</a>
            </div>
        `
    });
}

export async function sendUsageLimitReachedEmail(email: string, usageType: 'sessions' | 'recordings', limit: number, planName: string) {
    const usageLabel = usageType === 'sessions' ? 'Sessions' : 'Recordings';

    return sendEmail({
        to: email,
        subject: `🚫 ${usageLabel} limit reached - Action required`,
        html: `
            <h2 style="color: #DC2626;">Limit Reached</h2>
            <p>Hi there,</p>
            <p>You've reached your monthly <strong>${usageLabel.toLowerCase()}</strong> limit of <strong>${limit.toLocaleString()}</strong> on your <strong>${planName}</strong> plan.</p>
            
            <div style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); border: 2px solid #EF4444; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <div style="background: #EF4444; color: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-bottom: 12px;">
                    100% - Limit Reached
                </div>
                <p style="color: #991B1B; font-weight: 600; margin: 0;">
                    New ${usageLabel.toLowerCase()} will not be tracked until your quota resets or you upgrade.
                </p>
            </div>
            
            <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #374151;"><strong>What happens now?</strong></p>
                <ul style="color: #6B7280; margin: 8px 0;">
                    <li>Your existing data is safe and accessible</li>
                    <li>New ${usageLabel.toLowerCase()} won't be tracked</li>
                    <li>Limits reset at the start of next month</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Upgrade Now</a>
            </div>
            
            <p style="text-align: center; font-size: 14px; color: #6B7280;">
                Or wait until your billing cycle resets.
            </p>
        `
    });
}

export async function sendPaymentFailedEmail(email: string, planName: string) {
    return sendEmail({
        to: email,
        subject: 'Payment Failed ❌',
        html: `
            <h2 style="color: #DC2626;">Payment Failed</h2>
            <p>We were unable to process your payment for the <strong>${planName}</strong> plan.</p>
            <p>Your subscription may be suspended if we cannot process the payment.</p>
            <p>Please update your payment method to avoid any interruption to your service.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account" style="background-color: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Update Payment Method</a>
            </div>
        `
    });
}

