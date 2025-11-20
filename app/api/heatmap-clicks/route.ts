// app/api/heatmap-clicks/route.ts

import { createClient as createClickHouseClient } from '@clickhouse/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

// Initialize ClickHouse client
function createClickHouseConfig() {
  const url = process.env.CLICKHOUSE_URL;
  if (url) {
    // Parse ClickHouse URL: https://username:password@host:port/database
    const urlPattern = /^https?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = url.match(urlPattern);
    if (match) {
      const [, username, password, host, port, database] = match;
      return {
        host: `https://${host}:${port}`,
        username,
        password,
        database,
      };
    }
  }

  // Fallback to individual env vars
  return {
    host: process.env.CLICKHOUSE_HOST!,
    username: process.env.CLICKHOUSE_USERNAME!,
    password: process.env.CLICKHOUSE_PASSWORD!,
    database: process.env.CLICKHOUSE_DATABASE!,
  };
}

const clickhouse = createClickHouseClient(createClickHouseConfig());

// Initialize Supabase client
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Function to fetch DOM snapshot and extract href data for elements
async function getElementHrefsFromSnapshot(siteId: string, pagePath: string, deviceType: string, selectors: string[]): Promise<Map<string, string>> {
  try {
    // Normalize path to match upload logic
    const normalizedPath = pagePath === '/' ? 'homepage' : pagePath.replace(/^\//, '').replace(/\//g, '_');
    const filePath = `${siteId}/${deviceType}/${normalizedPath}.json`;

    console.log('Fetching DOM snapshot for href extraction:', filePath);

    const { data, error } = await supabase.storage
      .from('snapshots')
      .download(filePath);

    if (error) {
      console.warn('Could not fetch DOM snapshot for href extraction:', error.message);
      return new Map();
    }

    const text = await data.text();
    const snapshot = JSON.parse(text);

    const hrefMap = new Map<string, string>();

    // Function to recursively search DOM snapshot for elements matching selectors
    function findElementsBySelector(node: any, path = ''): void {
      if (!node) return;

      // Generate possible selectors for this node
      const selectors = [];

      // ID selector
      if (node.attributes && node.attributes.id) {
        selectors.push(`#${node.attributes.id}`);
      }

      // Class selector (first class)
      if (node.attributes && node.attributes.class) {
        const classes = node.attributes.class.split(' ').filter((c: string) => c.trim());
        if (classes.length > 0) {
          selectors.push(`${node.tagName}.${classes[0]}`);
        }
      }

      // Tag name selector
      if (node.tagName) {
        selectors.push(node.tagName.toLowerCase());
      }

      // Check if any of our target selectors match this node's possible selectors
      for (const nodeSelector of selectors) {
        if (selectors.includes(nodeSelector) && node.attributes?.href) {
          hrefMap.set(nodeSelector, node.attributes.href);
          break; // Found a match, no need to check other selectors for this node
        }
      }

      // Recursively search child nodes
      if (node.childNodes && Array.isArray(node.childNodes)) {
        node.childNodes.forEach((child: any, index: number) => {
          findElementsBySelector(child, `${path}[${index}]`);
        });
      }
    }

    if (snapshot.snapshot) {
      findElementsBySelector(snapshot.snapshot);
    }

    console.log(`Found href data for ${hrefMap.size} out of ${selectors.length} selectors`);
    return hrefMap;

  } catch (error) {
    console.error('Error fetching/parsing DOM snapshot for href extraction:', error);
    return new Map();
  }
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate user and get their authorized sites
    const authResult = await authenticateAndAuthorize(req);

    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const pagePath = searchParams.get('pagePath');
    const deviceType = searchParams.get('deviceType') || 'desktop';

    // Validate required parameters
    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json(
        { message: 'Missing or invalid siteId parameter' },
        { status: 400 }
      );
    }

    if (!pagePath || typeof pagePath !== 'string') {
      return NextResponse.json(
        { message: 'Missing or invalid pagePath parameter' },
        { status: 400 }
      );
    }

    // Validate siteId format (UUID)
    if (!validators.isValidUUID(siteId)) {
      return NextResponse.json(
        { message: 'Invalid siteId format' },
        { status: 400 }
      );
    }

    // Check if user is authorized for this site
    if (!isAuthorizedForSite(authResult.userSites, siteId)) {
      return createUnauthorizedResponse();
    }

    // Validate pagePath format
    if (!validators.isValidPagePath(pagePath)) {
      return NextResponse.json(
        { message: 'Invalid pagePath format' },
        { status: 400 }
      );
    }

    // Validate deviceType
    const validDeviceTypes = ['desktop', 'tablet', 'mobile'];
    if (!validDeviceTypes.includes(deviceType)) {
      return NextResponse.json(
        { message: 'Invalid deviceType. Must be one of: desktop, tablet, mobile' },
        { status: 400 }
      );
    }

    // Query ClickHouse for element-specific click data (high precision with centroid calculation)
    const elementQuery = `
      SELECT
        element_selector as selector,
        element_tag as tag,
        element_text as text,
        element_id,
        element_classes,
        -- Calculate the centroid of clicks on this element
        round(avg(x), 2) as x,
        round(avg(y), 2) as y,
        count(*) as click_count
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        -- Device filter logic
        AND (device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} = 'desktop'))
        AND event_type = 'click'
        AND timestamp >= now() - INTERVAL 30 DAY
        -- Ensure we only look at valid element clicks
        AND element_selector != ''
        AND x > 0 
        AND y > 0
      GROUP BY 
        element_selector, 
        element_tag, 
        element_text, 
        element_id, 
        element_classes
      ORDER BY click_count DESC
      LIMIT 100
    `;

    // Query for all click points (traditional heatmap with high-precision binning)
    const allClicksQuery = `
      SELECT
        -- Binning: Round to nearest 2 pixels to group very close clicks
        -- This reduces data volume without losing visual precision
        round(x / 2) * 2 as x, 
        round(y / 2) * 2 as y,
        count(*) as value
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND (device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} = 'desktop'))
        AND event_type = 'click'
        AND timestamp >= now() - INTERVAL 30 DAY
        AND x > 0
        AND y > 0
      GROUP BY x, y
      ORDER BY value DESC
      LIMIT 5000
    `;

    console.log('Executing ClickHouse queries for heatmap clicks');
    console.log('Query params:', { siteId, pagePath, deviceType });

    // Execute element clicks query
    const elementResult = await clickhouse.query({
      query: elementQuery,
      query_params: {
        siteId,
        pagePath,
        deviceType,
      },
      format: 'JSONEachRow',
    });

    // Execute all clicks query
    const allClicksResult = await clickhouse.query({
      query: allClicksQuery,
      query_params: {
        siteId,
        pagePath,
        deviceType,
      },
      format: 'JSONEachRow',
    });

    const elementRows = await elementResult.json();
    const allClicksRows = await allClicksResult.json();

    console.log('ClickHouse returned', elementRows.length, 'element click groups');
    console.log('ClickHouse returned', allClicksRows.length, 'all click points');

    // Fetch href data from DOM snapshot if we have element rows
    let hrefMap = new Map<string, string>();
    if (elementRows.length > 0) {
      const selectors = elementRows.map((row: any) => row.selector);
      console.log('Element selectors from ClickHouse:', selectors.slice(0, 5)); // Log first 5 selectors
      hrefMap = await getElementHrefsFromSnapshot(siteId, pagePath, deviceType, selectors);
      console.log('Found href mappings:', Object.fromEntries(hrefMap));
    }

    // Transform to ElementNode format with click data
    interface ElementClickRow {
      selector: string;
      tag: string;
      text: string;
      element_id: string;
      element_classes: string;
      x: string;
      y: string;
      click_count: string;
    }

    // Calculate total clicks for percentage calculation
    const totalClicks = elementRows.reduce((sum: number, row: any) => sum + parseInt(row.click_count), 0);

    const elementClicks = (elementRows as ElementClickRow[]).map((row) => ({
      selector: row.selector,
      tag: row.tag,
      text: row.text || '',
      x: Math.round(parseFloat(row.x)), // Already rounded in query, ensure integer
      y: Math.round(parseFloat(row.y)), // Already rounded in query, ensure integer
      width: 0, // Will be calculated from DOM
      height: 0, // Will be calculated from DOM
      href: hrefMap.get(row.selector) || undefined, // Get href from DOM snapshot
      clickCount: parseInt(row.click_count),
      percentage: totalClicks > 0 ? parseFloat((parseInt(row.click_count) * 100.0 / totalClicks).toFixed(1)) : 0,
      elementId: row.element_id || '',
      elementClasses: row.element_classes || '',
    }));

    // Transform all click points
    interface ClickRow {
      x: string;
      y: string;
      value: string;
    }
    const clickPoints = (allClicksRows as ClickRow[]).map((row) => ({
      x: parseInt(row.x),
      y: parseInt(row.y),
      value: parseInt(row.value),
    }));

    console.log('Returning', elementClicks.length, 'element click data and', clickPoints.length, 'click points to frontend');
    return NextResponse.json({
      elements: elementClicks,
      clicks: clickPoints
    }, { status: 200 });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch heatmap data', error: errorMessage },
      { status: 500 }
    );
  }
}