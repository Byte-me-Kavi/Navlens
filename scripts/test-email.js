
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

const SMTP_EMAIL = process.env.SMTP_EMAIL || 'navlensanalytics@gmail.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

async function testEmail() {
    console.log('📧 Testing Email Configuration...');
    console.log(`User: ${SMTP_EMAIL}`);
    console.log(`Password: ${SMTP_PASSWORD ? '****** (Set)' : 'MISSING'}`);

    if (!SMTP_PASSWORD) {
        console.error('❌ Error: SMTP_PASSWORD is not set in .env.local');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: SMTP_EMAIL,
            pass: SMTP_PASSWORD,
        },
    });

    try {
        console.log('Attempting to verify connection...');
        await transporter.verify();
        console.log('✅ Connection Successful!');

        console.log('Attempting to send test email...');
        await transporter.sendMail({
            from: `"Navlens Test" <${SMTP_EMAIL}>`,
            to: SMTP_EMAIL, // Send to self
            subject: 'Test Email from Navlens',
            text: 'If you see this, your SMTP credentials are correct!',
        });
        console.log('✅ Test Email Sent Successfully!');
        console.log('\nCONCLUSION: Your App Password works. Copy it exactly to Supabase.');

    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        if (error.code === 'EAUTH') {
            console.log('\nTIP: Double-check your App Password. It should be 16 characters, no spaces.');
        }
    }
}

testEmail();
