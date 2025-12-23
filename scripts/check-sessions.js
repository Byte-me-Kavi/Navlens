
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- CHECKING SESSION COUNTS ---');

    // 1. Get all sessions (What the Sessions Page sees)
    const { data: allSessions, error: error1 } = await supabase
        .from('rrweb_events')
        .select('session_id, timestamp, site_id');
    
    if (error1) {
        console.error('Error fetching all sessions:', error1);
        return;
    }

    console.log(`Fetched ${allSessions.length} event rows.`);
    const fs = require('fs');
    const outFile = 'session_counts.txt';
    
    // Group by Site ID
    const sessionsBySite = {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    allSessions.forEach(s => {
        if (!sessionsBySite[s.site_id]) {
            sessionsBySite[s.site_id] = { total: new Set(), thisMonth: new Set() };
        }
        sessionsBySite[s.site_id].total.add(s.session_id);
        if (s.timestamp >= startOfMonth) {
            sessionsBySite[s.site_id].thisMonth.add(s.session_id);
        }
    });

    let output = '';
    let grandTotalUsage = 0;

    const oldSessions = allSessions.filter(s => s.timestamp < startOfMonth);
    const oldUnique = new Set(oldSessions.map(s => s.session_id));
    const totalUnique = new Set(allSessions.map(s => s.session_id));
    
    const conciseOutput = `
    Global Stats:
    - Total Sessions: ${totalUnique.size}
    - This Month: ${Array.from(totalUnique).filter(id => !oldUnique.has(id)).length}
    - Old Sessions: ${oldUnique.size}
    `;
    
    fs.writeFileSync(outFile, conciseOutput);
    console.log(conciseOutput);
}

main();
