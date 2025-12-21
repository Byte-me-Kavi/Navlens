const http = require('http');

async function hit(path) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:3000${path}`, (res) => {
            console.log(`GET ${path} -> ${res.statusCode}`);
            res.on('data', () => {}); // Consume body
            res.on('end', resolve);
        });
        req.on('error', (e) => {
            console.error(`Error hitting ${path}:`, e.message);
            resolve();
        });
    });
}

// Mock POST request
async function hitPost(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            console.log(`POST ${path} -> ${res.statusCode}`);
            res.on('data', () => {});
            res.on('end', resolve);
        });
        req.on('error', (e) => {
            console.error(`Error hitting ${path}:`, e.message);
            resolve();
        });
        req.write(JSON.stringify({ siteId: 'dummy', pagePath: '/' }));
        req.end();
    });
}

async function run() {
    console.log('Generating traffic to populate metrics...');
    
    // Tracker
    await hit('/api/tracker-config?siteId=dummy-site-123');
    
    // Heatmaps (POST)
    await hitPost('/api/heatmap-clicks');
    
    // Sessions (POST)
    await hitPost('/api/sessions');
    
    // Experiments
    await hit('/api/experiments?siteId=dummy-site-123');
    
    console.log('Done! Metrics should now be populated.');
}

run();
