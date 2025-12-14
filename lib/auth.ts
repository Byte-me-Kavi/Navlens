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
 * Retry logic with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.warn(`Retry attempt ${attempt + 1}/${maxRetries}, waiting ${delay}ms...`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
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

    // Authenticate user with retry
    const authResult = await withRetry(
      async () => supabase.auth.getUser(),
      3,
      100
    );

    const { data: { user }, error: authError } = authResult as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (authError || !user) {
      return {
        user: null,
        userSites: [],
        isAuthorized: false
      };
    }

    // Get sites owned by user with retry
    const siteResult = await withRetry(
      async () => supabase
        .from('sites')
        .select('id')
        .eq('user_id', user.id),
      3,
      100
    );

    const { data: userSites, error: siteError } = siteResult as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (siteError) {
      console.error('Error fetching user sites after retries:', siteError);
      return {
        user,
        userSites: [],
        isAuthorized: false
      };
    }

    const siteIds = userSites?.map((site: any) => site.id) || []; // eslint-disable-line @typescript-eslint/no-explicit-any

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

/**
 * Validates auth token from request headers or cookies
 * Returns { valid: boolean, userId: string | null }
 */
export async function validateAuthToken(request: NextRequest): Promise<{ valid: boolean; userId: string | null }> {
  try {
    const authResult = await authenticateAndAuthorize(request);

    if (!authResult.isAuthorized || !authResult.user) {
      return { valid: false, userId: null };
    }

    return { valid: true, userId: authResult.user.id };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, userId: null };
  }
}

/**
 * Get the authenticated user from request
 * Returns the user object or null if not authenticated
 */
export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  try {
    const authResult = await authenticateAndAuthorize(request);
    return authResult.user;
  } catch (error) {
    console.error('Get user from request error:', error);
    return null;
  }
}