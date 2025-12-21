
require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('--- Email Diagnostic ---');
    console.log('1. Checking Environment Variables...');
    const user = process.env.SMTP_EMAIL;
    const pass = process.env.SMTP_PASSWORD;
    const admin = process.env.ADMIN_EMAIL;

    if (!user) console.error('❌ SMTP_EMAIL is missing');
    else console.log(`✅ SMTP_EMAIL found: ${user}`);

    if (!pass) console.error('❌ SMTP_PASSWORD is missing');
    else console.log('✅ SMTP_PASSWORD found (length: ' + pass.length + ')');

    if (!user || !pass) {
        console.error('\nStopping. Please check .env.local');
        return;
    }

    console.log('\n2. Attempting to send email...');
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    try {
        const info = await transporter.sendMail({
            from: `"Test" <${user}>`,
            to: admin || user,
            subject: 'Test Email from NavLens',
            text: 'If you see this, email sending is working correctly!'
        });
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Failed to send email:');
        console.error(error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n💡 Hint: Check your App Password. It should be 16 characters (spaces are fine).');
        }
    }
}

testEmail();
