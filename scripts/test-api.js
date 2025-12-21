
const fetch = require('node-fetch'); // might not be installed
// fallback to built-in fetch in newer node
async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/users/plans');
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Keys:', data.length > 0 ? Object.keys(data[0]) : 'Empty Array');
        console.log('First Item:', data[0]);
    } catch (e) {
        console.error(e);
    }
}
run();
