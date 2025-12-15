/**
 * Experiment Config Publisher
 * 
 * Publishes experiment configurations to Supabase Storage for CDN delivery.
 * This enables ~30ms config fetch vs 200-500ms API calls.
 * 
 * Called when:
 * - Experiment is started/paused/stopped
 * - Modifications are saved
 * - Traffic percentage is changed
 */

import { createClient } from '@supabase/supabase-js';

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STORAGE_BUCKET = 'experiment-configs';

/**
 * Minimal experiment config for CDN delivery
 */
interface PublishedExperiment {
    id: string;
    v: Array<{ id: string; name: string; weight: number }>; // variants
    m: Modification[]; // modifications
    t: number; // traffic percentage
    g?: string; // goal event
}

interface Modification {
    id: string;
    selector: string;
    variant_id: string;
    type: 'css' | 'text' | 'hide' | 'redirect';
    changes: {
        css?: Record<string, string>;
        text?: string;
        redirectUrl?: string;
    };
}

interface PublishedConfig {
    v: number; // version (for cache busting)
    ts: number; // timestamp
    experiments: PublishedExperiment[];
}

/**
 * Publish experiment config to Supabase Storage
 * 
 * This creates/updates a static JSON file at:
 * /experiment-configs/{siteId}/config.json
 */
export async function publishSiteConfig(siteId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Get all active experiments for this site
        const { data: experiments, error: queryError } = await supabaseAdmin
            .from('experiments')
            .select('id, variants, modifications, traffic_percentage, goal_event, goals')
            .eq('site_id', siteId)
            .eq('status', 'running');

        if (queryError) {
            console.error('[publisher] Query error:', queryError);
            return { success: false, error: queryError.message };
        }

        // 2. Transform into minimal payload
        const payload: PublishedConfig = {
            v: 1,
            ts: Date.now(),
            experiments: (experiments || []).map(e => ({
                id: e.id,
                v: e.variants || [],
                m: e.modifications || [],
                t: e.traffic_percentage || 100,
                g: e.goal_event || undefined,
                goals: e.goals || []  // NEW: Include goals array for enterprise tracking
            }))
        };

        // 3. Upload to public bucket
        const filePath = `${siteId}/config.json`;
        const jsonContent = JSON.stringify(payload);

        const { error: uploadError } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, jsonContent, {
                upsert: true,
                contentType: 'application/json',
                cacheControl: 'public, max-age=60, s-maxage=60' // 1 min CDN cache
            });

        if (uploadError) {
            console.error('[publisher] Upload error:', uploadError);
            return { success: false, error: uploadError.message };
        }

        console.log(`[publisher] Published config for site ${siteId} with ${payload.experiments.length} experiments`);
        return { success: true };

    } catch (error) {
        console.error('[publisher] Unexpected error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Delete site config from storage (when no active experiments)
 */
export async function deleteSiteConfig(siteId: string): Promise<void> {
    try {
        await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .remove([`${siteId}/config.json`]);
        console.log(`[publisher] Deleted config for site ${siteId}`);
    } catch (error) {
        console.warn('[publisher] Failed to delete config:', error);
    }
}

/**
 * Get the public URL for a site's config
 */
export function getConfigUrl(siteId: string): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${siteId}/config.json`;
}

/**
 * Ensure the storage bucket exists with public access
 */
export async function ensureStorageBucket(): Promise<void> {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();

    const exists = buckets?.some(b => b.name === STORAGE_BUCKET);

    if (!exists) {
        const { error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
            public: true,
            fileSizeLimit: 1024 * 100 // 100KB max per file
        });

        if (error) {
            console.error('[publisher] Failed to create bucket:', error);
        } else {
            console.log('[publisher] Created storage bucket:', STORAGE_BUCKET);
        }
    }
}
