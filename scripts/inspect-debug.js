
const fetch = require('node-fetch'); // fallback if needed

async function check() {
    const url = 'https://navlens-rho.vercel.app';
    console.log('Fetching', url);
    try {
        const res = await fetch(url);
        const html = await res.text();
        console.log('Length:', html.length);
        
        console.log('Includes tracker.js?', html.includes('tracker.js'));
        console.log('Includes navlens.js?', html.includes('navlens.js'));
        console.log('Includes data-site-id?', html.includes('data-site-id'));

        // Dump script tags
        const scripts = html.match(/<script[^>]*>/g);
        console.log('Scripts:', scripts);
    } catch (e) {
        console.error(e);
    }
}
check();
