import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuthToken } from '@/lib/auth';

// Create Supabase admin client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch session notes
export async function GET(request: NextRequest) {
    try {
        // Validate auth
        const authResult = await validateAuthToken(request);
        if (!authResult.valid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const siteId = searchParams.get('siteId');

        if (!siteId) {
            return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        let query = supabase
            .from('session_notes')
            .select('*')
            .eq('site_id', siteId)
            .order('created_at', { ascending: false });

        // Filter by session if provided
        if (sessionId) {
            query = query.eq('session_id', sessionId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[session-notes] Query error:', error);
            return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
        }

        return NextResponse.json({ notes: data || [] });
    } catch (error: unknown) {
        console.error('[session-notes] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create a new session note
export async function POST(request: NextRequest) {
    try {
        // Validate auth
        const authResult = await validateAuthToken(request);
        if (!authResult.valid || !authResult.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { siteId, sessionId, note, tags } = body;

        if (!siteId || !sessionId) {
            return NextResponse.json({ error: 'siteId and sessionId are required' }, { status: 400 });
        }

        if (!note || note.trim().length === 0) {
            return NextResponse.json({ error: 'note is required' }, { status: 400 });
        }

        // Validate note length
        if (note.length > 5000) {
            return NextResponse.json({ error: 'Note too long (max 5000 chars)' }, { status: 400 });
        }

        // Validate tags if provided
        const validTags = Array.isArray(tags)
            ? tags.filter((t: unknown) => typeof t === 'string' && t.length <= 50).slice(0, 10)
            : [];

        const { data, error } = await supabase
            .from('session_notes')
            .insert({
                site_id: siteId,
                session_id: sessionId,
                note: note.trim(),
                tags: validTags,
                created_by: authResult.userId,
            })
            .select()
            .single();

        if (error) {
            console.error('[session-notes] Insert error:', error);
            return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
        }

        return NextResponse.json({ note: data }, { status: 201 });
    } catch (error: unknown) {
        console.error('[session-notes] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Update a session note
export async function PATCH(request: NextRequest) {
    try {
        // Validate auth
        const authResult = await validateAuthToken(request);
        if (!authResult.valid || !authResult.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, note, tags } = body;

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        // Build update object
        const updates: Record<string, unknown> = {};

        if (note !== undefined) {
            if (typeof note !== 'string' || note.trim().length === 0) {
                return NextResponse.json({ error: 'note must be a non-empty string' }, { status: 400 });
            }
            if (note.length > 5000) {
                return NextResponse.json({ error: 'Note too long (max 5000 chars)' }, { status: 400 });
            }
            updates.note = note.trim();
        }

        if (tags !== undefined) {
            const validTags = Array.isArray(tags)
                ? tags.filter((t: unknown) => typeof t === 'string' && t.length <= 50).slice(0, 10)
                : [];
            updates.tags = validTags;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('session_notes')
            .select('created_by')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        if (existing.created_by !== authResult.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data, error } = await supabase
            .from('session_notes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[session-notes] Update error:', error);
            return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
        }

        return NextResponse.json({ note: data });
    } catch (error: unknown) {
        console.error('[session-notes] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete a session note
export async function DELETE(request: NextRequest) {
    try {
        // Validate auth
        const authResult = await validateAuthToken(request);
        if (!authResult.valid || !authResult.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('session_notes')
            .select('created_by')
            .eq('id', id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        if (existing.created_by !== authResult.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error } = await supabase
            .from('session_notes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[session-notes] Delete error:', error);
            return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[session-notes] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
