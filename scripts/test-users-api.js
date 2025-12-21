
const fetch = require('node-fetch'); // fallback

async function checkUsers() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/users');
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text.substring(0, 500) + '...');
    } catch (e) {
        console.error(e);
    }
}
checkUsers();
