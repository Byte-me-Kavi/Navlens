/**
 * Funnels API Route
 * 
 * Provides CRUD operations for conversion funnels.
 * Uses Supabase for funnel storage and ClickHouse for analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createClickHouseClient } from '@clickhouse/client';
import { unstable_cache } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';

// Initialize ClickHouse client
function createClickHouseConfig() {
  const url = process.env.CLICKHOUSE_URL;
  if (url) {
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

  return {
    host: process.env.CLICKHOUSE_HOST!,
    username: process.env.CLICKHOUSE_USERNAME!,
    password: process.env.CLICKHOUSE_PASSWORD!,
    database: process.env.CLICKHOUSE_DATABASE!,
  };
}

const clickhouse = createClickHouseClient(createClickHouseConfig());

// Create Supabase server client
async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// Interface for funnel step
interface FunnelStep {
  id: string;
  name: string;
  page_path: string;
  order_index: number;
  conditions?: {
    type: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex';
    value: string;
  }[];
}

// Interface for funnel
interface Funnel {
  id: string;
  site_id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Cached funnel analysis using ClickHouse windowFunnel
const getCachedFunnelAnalysis = unstable_cache(
  async (siteId: string, steps: FunnelStep[], startDate: string, endDate: string) => {
    // Build windowFunnel conditions
    const stepConditions = steps
      .sort((a, b) => a.order_index - b.order_index)
      .map(step => {
        if (step.conditions && step.conditions.length > 0) {
          const pathConditions = step.conditions.map(condition => {
            switch (condition.type) {
              case 'contains':
                return `position(page_path, '${condition.value}') > 0`;
              case 'equals':
                return `page_path = '${condition.value}'`;
              case 'starts_with':
                return `startsWith(page_path, '${condition.value}')`;
              case 'ends_with':
                return `endsWith(page_path, '${condition.value}')`;
              case 'regex':
                return `match(page_path, '${condition.value}')`;
              default:
                return `page_path = '${step.page_path}'`;
            }
          }).join(' OR ');
          return `(${pathConditions})`;
        }
        return `page_path = '${step.page_path}'`;
      });

    // Query using windowFunnel function for accurate funnel analysis
    // windowFunnel returns 0 if no steps matched, 1 if only step 1, 2 if steps 1+2, etc.
    const funnelQuery = `
      SELECT
        funnel_level,
        count() AS sessions_count
      FROM (
        SELECT
          session_id,
          windowFunnel(86400)(
            timestamp,
            ${stepConditions.join(',\n            ')}
          ) AS funnel_level
        FROM events
        WHERE site_id = {siteId:String}
          AND toDate(timestamp) >= toDate({startDate:String})
          AND toDate(timestamp) <= toDate({endDate:String})
          AND event_type = 'page_view'
        GROUP BY session_id
      )
      WHERE funnel_level > 0
      GROUP BY funnel_level
      ORDER BY funnel_level
    `;

    console.log('🔍 Funnel Query:', funnelQuery);
    console.log('🔍 Query Params:', { siteId, startDate, endDate });

    const result = await clickhouse.query({
      query: funnelQuery,
      query_params: { siteId, startDate, endDate },
      format: 'JSONEachRow',
    });

    const rows = await result.json();
    console.log('🔍 Funnel Query Results:', rows);

    // Aggregate results by funnel level
    // Level N means the session completed steps 1 through N
    const levelCounts: { [key: number]: number } = {};
    (rows as Array<{ funnel_level: number; sessions_count: string }>).forEach(row => {
      const level = Number(row.funnel_level);
      levelCounts[level] = (levelCounts[level] || 0) + Number(row.sessions_count);
    });

    console.log('🔍 Level Counts:', levelCounts);

    // Build step results with cumulative counts
    // For step N, count all sessions that reached at least level N
    const stepResults = steps.map((step, index) => {
      const stepNumber = index + 1;
      // Count sessions that reached at least this step level
      let visitors = 0;
      for (let level = stepNumber; level <= steps.length; level++) {
        visitors += levelCounts[level] || 0;
      }
      
      return {
        step_id: step.id,
        step_name: step.name,
        order_index: step.order_index,
        visitors,
        conversion_rate: 0,
        drop_off_rate: 0,
      };
    });

    // Calculate conversion and drop-off rates
    const totalVisitors = stepResults[0]?.visitors || 0;
    stepResults.forEach((step, index) => {
      step.conversion_rate = totalVisitors > 0 
        ? Math.round((step.visitors / totalVisitors) * 10000) / 100 
        : 0;
      
      if (index > 0) {
        const prevVisitors = stepResults[index - 1].visitors;
        step.drop_off_rate = prevVisitors > 0 
          ? Math.round(((prevVisitors - step.visitors) / prevVisitors) * 10000) / 100 
          : 0;
      }
    });

    return {
      total_sessions: totalVisitors,
      overall_conversion_rate: stepResults.length > 1 && totalVisitors > 0
        ? Math.round((stepResults[stepResults.length - 1].visitors / totalVisitors) * 10000) / 100
        : 0,
      step_results: stepResults,
      analyzed_at: new Date().toISOString(),
    };
  },
  ['funnel-analysis'],
  { revalidate: 300 } // Cache for 5 minutes
);

/**
 * GET - List all funnels for a site or analyze a specific funnel
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateAndAuthorize(req);
    
    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const funnelId = searchParams.get('funnelId');
    const action = searchParams.get('action'); // 'list' or 'analyze'
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    if (!siteId || !validators.isValidUUID(siteId)) {
      return NextResponse.json(
        { error: 'Valid siteId is required' },
        { status: 400 }
      );
    }

    if (!isAuthorizedForSite(authResult.userSites, siteId)) {
      return createUnauthorizedResponse();
    }

    const supabase = await createSupabaseClient();

    if (action === 'analyze' && funnelId) {
      // Get funnel details
      const { data: funnel, error: funnelError } = await supabase
        .from('funnels')
        .select('*')
        .eq('id', funnelId)
        .eq('site_id', siteId)
        .single();

      if (funnelError || !funnel) {
        return NextResponse.json(
          { error: 'Funnel not found' },
          { status: 404 }
        );
      }

      // Analyze funnel using ClickHouse
      const analysis = await getCachedFunnelAnalysis(
        siteId,
        funnel.steps as FunnelStep[],
        startDate,
        endDate
      );

      return encryptedJsonResponse({
        funnel,
        analysis,
      });
    }

    // List all funnels for the site
    const { data: funnels, error } = await supabase
      .from('funnels')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching funnels:', error);
      return NextResponse.json(
        { error: 'Failed to fetch funnels' },
        { status: 500 }
      );
    }

    return encryptedJsonResponse({
      funnels: funnels || [],
    });

  } catch (error) {
    console.error('Error in funnels GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new funnel
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateAndAuthorize(req);
    
    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const body = await req.json();
    const { site_id, name, description, steps } = body;

    // Validate required fields
    if (!site_id || !validators.isValidUUID(site_id)) {
      return NextResponse.json(
        { error: 'Valid site_id is required' },
        { status: 400 }
      );
    }

    if (!isAuthorizedForSite(authResult.userSites, site_id)) {
      return createUnauthorizedResponse();
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Funnel name is required' },
        { status: 400 }
      );
    }

    if (!steps || !Array.isArray(steps) || steps.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 funnel steps are required' },
        { status: 400 }
      );
    }

    // Validate each step
    for (const step of steps) {
      if (!step.name || !step.page_path) {
        return NextResponse.json(
          { error: 'Each step must have a name and page_path' },
          { status: 400 }
        );
      }
    }

    const supabase = await createSupabaseClient();

    // Create funnel
    const { data: funnel, error } = await supabase
      .from('funnels')
      .insert({
        site_id,
        name: name.trim(),
        description: description?.trim() || null,
        steps: steps.map((step: FunnelStep, index: number) => ({
          id: step.id || crypto.randomUUID(),
          name: step.name,
          page_path: step.page_path,
          order_index: index,
          conditions: step.conditions || [],
        })),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating funnel:', error);
      return NextResponse.json(
        { error: 'Failed to create funnel' },
        { status: 500 }
      );
    }

    return encryptedJsonResponse({
      funnel,
      message: 'Funnel created successfully',
    });

  } catch (error) {
    console.error('Error in funnels POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update an existing funnel
 */
export async function PUT(req: NextRequest) {
  try {
    const authResult = await authenticateAndAuthorize(req);
    
    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const body = await req.json();
    const { id, site_id, name, description, steps, is_active } = body;

    if (!id || !validators.isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Valid funnel id is required' },
        { status: 400 }
      );
    }

    if (!site_id || !validators.isValidUUID(site_id)) {
      return NextResponse.json(
        { error: 'Valid site_id is required' },
        { status: 400 }
      );
    }

    if (!isAuthorizedForSite(authResult.userSites, site_id)) {
      return createUnauthorizedResponse();
    }

    const supabase = await createSupabaseClient();

    // Verify funnel exists and belongs to site
    const { data: existing } = await supabase
      .from('funnels')
      .select('id')
      .eq('id', id)
      .eq('site_id', site_id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Funnel not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (is_active !== undefined) updates.is_active = is_active;
    if (steps !== undefined) {
      updates.steps = steps.map((step: FunnelStep, index: number) => ({
        id: step.id || crypto.randomUUID(),
        name: step.name,
        page_path: step.page_path,
        order_index: index,
        conditions: step.conditions || [],
      }));
    }

    const { data: funnel, error } = await supabase
      .from('funnels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating funnel:', error);
      return NextResponse.json(
        { error: 'Failed to update funnel' },
        { status: 500 }
      );
    }

    return encryptedJsonResponse({
      funnel,
      message: 'Funnel updated successfully',
    });

  } catch (error) {
    console.error('Error in funnels PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a funnel
 */
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await authenticateAndAuthorize(req);
    
    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const { searchParams } = new URL(req.url);
    const funnelId = searchParams.get('id');
    const siteId = searchParams.get('siteId');

    if (!funnelId || !validators.isValidUUID(funnelId)) {
      return NextResponse.json(
        { error: 'Valid funnel id is required' },
        { status: 400 }
      );
    }

    if (!siteId || !validators.isValidUUID(siteId)) {
      return NextResponse.json(
        { error: 'Valid siteId is required' },
        { status: 400 }
      );
    }

    if (!isAuthorizedForSite(authResult.userSites, siteId)) {
      return createUnauthorizedResponse();
    }

    const supabase = await createSupabaseClient();

    // Verify funnel exists and belongs to site
    const { data: existing } = await supabase
      .from('funnels')
      .select('id')
      .eq('id', funnelId)
      .eq('site_id', siteId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Funnel not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('funnels')
      .delete()
      .eq('id', funnelId);

    if (error) {
      console.error('Error deleting funnel:', error);
      return NextResponse.json(
        { error: 'Failed to delete funnel' },
        { status: 500 }
      );
    }

    return encryptedJsonResponse({
      message: 'Funnel deleted successfully',
    });

  } catch (error) {
    console.error('Error in funnels DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
