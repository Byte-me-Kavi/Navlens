import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  userSites: string[];
  isAuthorized: boolean;
}

/**
 * Authenticates user and returns their authorized site IDs
 * This ensures users can only access data from sites they own
 */
export async function authenticateAndAuthorize(request?: NextRequest): Promise<AuthResult> { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    // Get cookies
    const cookieStore = await cookies();

    // Initialize Supabase client
    const supabase = createServerClient(
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

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        user: null,
        userSites: [],
        isAuthorized: false
      };
    }

    // Get sites owned by user
    const { data: userSites, error: siteError } = await supabase
      .from('sites')
      .select('id')
      .eq('user_id', user.id);

    if (siteError) {
      console.error('Error fetching user sites:', siteError);
      return {
        user,
        userSites: [],
        isAuthorized: false
      };
    }

    const siteIds = userSites?.map(site => site.id) || [];

    return {
      user,
      userSites: siteIds,
      isAuthorized: true
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      user: null,
      userSites: [],
      isAuthorized: false
    };
  }
}

/**
 * Checks if a user is authorized to access a specific site
 */
export function isAuthorizedForSite(userSites: string[], siteId: string): boolean {
  return userSites.includes(siteId);
}

/**
 * Creates an unauthorized response
 */
export function createUnauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized - you do not have access to this site' },
    { status: 403 }
  );
}

/**
 * Creates an unauthenticated response
 */
export function createUnauthenticatedResponse() {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}