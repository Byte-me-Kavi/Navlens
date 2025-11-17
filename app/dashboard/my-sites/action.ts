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
