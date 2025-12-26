'use server'; // This marks all functions in this file as Server Actions

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { validators } from '@/lib/validation';

// This is our main 'create site' action
export async function createSite(formData: FormData) {
    const siteName = formData.get('site_name') as string;
    const domain = formData.get('domain') as string;

    // 1. Comprehensive Input Validation
    if (!siteName || !domain) {
        return { success: false, message: 'Site name and domain are required.' };
    }

    // Validate site name format
    if (!validators.isValidSiteName(siteName)) {
        return { success: false, message: 'Site name contains invalid characters or is too long.' };
    }

    // Validate domain format
    if (!validators.isValidDomain(domain)) {
        return { success: false, message: 'Please enter a valid domain URL (e.g., https://example.com).' };
    }

    // Sanitize inputs
    const sanitizedSiteName = validators.sanitizeString(siteName, 100);
    const sanitizedDomain = validators.sanitizeString(domain, 500);

    const cookieStore = await cookies();
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
                        cookieStore.set(name, value, options),
                    );
                },
            },
        },
    );

    // 2. Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'User not authenticated.' };
    }

    // --- LIMIT ENFORCEMENT START ---
    // Fetch user's subscription to determine site limit
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
            status,
            subscription_plans (
                name,
                limits
            )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

    // Default limit (Free plan)
    let maxSites = 1;

    if (subscription?.subscription_plans) {
        const plan = Array.isArray(subscription.subscription_plans)
            ? subscription.subscription_plans[0]
            : subscription.subscription_plans;
        const limits = plan?.limits as Record<string, number> | undefined;

        // Check limit from Plan Config (Database)
        if (limits?.max_sites !== undefined) {
            maxSites = limits.max_sites;
        } else {
            // Fallback based on plan name if limit not explicitly in DB column yet
            const planName = plan?.name?.toLowerCase() || '';
            if (planName.includes('starter')) maxSites = 3;
            else if (planName.includes('pro')) maxSites = 5;
            else if (planName.includes('enterprise')) maxSites = 999;
        }

        console.log('[SiteLimit] User:', user.email, 'Plan:', plan?.name, 'MaxSites:', maxSites);
    } else {
        console.log('[SiteLimit] No active subscription for user:', user.email, 'Using default maxSites:', maxSites);
    }

    // Count existing sites
    const { count: currentSiteCount, error: countError } = await supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if (countError) {
        console.error('Error checking site limits:', countError);
        return { success: false, message: 'Failed to verify plan limits.' };
    }

    if (maxSites !== -1 && (currentSiteCount || 0) >= maxSites) {
        return {
            success: false,
            message: `Plan limit reached. You can only create ${maxSites} site${maxSites === 1 ? '' : 's'} on your current plan. Please upgrade to add more.`
        };
    }
    // --- LIMIT ENFORCEMENT END ---

    // 3. Insert the new site into the database
    // The 'api_key' is set by default in the DB, but we add user_id
    const { data, error } = await supabase
        .from('sites')
        .insert({
            site_name: sanitizedSiteName,
            domain: sanitizedDomain,
            user_id: user.id,
        })
        .select() // 'select()' returns the new row, which is useful
        .single(); // We only expect one row back

    // 4. Handle errors
    if (error) {
        console.error('Error creating site:', error);
        return { success: false, message: `Failed to create site: ${error.message}` };
    }

    // 5. Auto-insert default page paths for new sites
    const DEFAULT_PATHS = ["/", "/about", "/contact", "/pricing", "/blog", "/services"];

    const pagePathsToInsert = DEFAULT_PATHS.map(path => ({
        site_id: data.id,
        page_path: path,
    }));

    const { error: pathsError } = await supabase
        .from('page_paths')
        .insert(pagePathsToInsert)
        .select();

    if (pathsError) {
        console.warn('Warning: Could not auto-populate default page paths:', pathsError);
        // Don't fail the site creation, just warn
    }

    // 6. Revalidate the path
    // This tells Next.js to refresh the '/dashboard/sites' page
    // so the new site appears in the list instantly.
    revalidatePath('/dashboard/sites');

    return {
        success: true,
        message: 'Site created successfully! Default page paths have been added.',
        newSite: data,
    };
}

// This is our 'delete site' action
export async function deleteSite(siteId: string) {
    if (!siteId) {
        return { success: false, message: 'Site ID is required.' };
    }

    const cookieStore = await cookies();
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
                        cookieStore.set(name, value, options),
                    );
                },
            },
        },
    );

    const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId); // RLS policy ensures they can only delete their own!

    if (error) {
        console.error('Error deleting site:', error);
        return { success: false, message: `Failed to delete site: ${error.message}` };
    }

    revalidatePath('/dashboard/sites');
    return { success: true, message: 'Site deleted.' };
}
