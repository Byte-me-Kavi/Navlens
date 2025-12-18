/**
 * Unified AI API Endpoint - Optimized
 * 
 * Features: History limiting, message summarization, site awareness
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSystemPrompt, type AIContext, type SiteInfo } from './prompts';

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// History limits
const MAX_HISTORY_MESSAGES = 6; // Keep last 6 messages (3 exchanges)
const SUMMARIZE_THRESHOLD = 8; // Summarize when history exceeds this

const getApiKey = () => process.env.GROQ_API_KEY!;

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface AIRequest {
    message: string;
    context: AIContext;
    contextData?: Record<string, unknown>;
    history?: ChatMessage[];
    stream?: boolean;
}

// Authenticate and get user info
async function authenticateUser() {
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
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return null;

    // Fetch user's sites
    const { data: sites } = await supabase
        .from('sites')
        .select('id, name, domain')
        .eq('user_id', session.user.id)
        .limit(10);

    return { session, sites: sites as SiteInfo[] | null };
}

// Summarize older messages to save tokens
function summarizeOldHistory(history: ChatMessage[]): string {
    if (history.length === 0) return '';

    const topics: string[] = [];
    for (const msg of history) {
        if (msg.role === 'user') {
            // Extract key words from user questions
            const content = msg.content.toLowerCase();
            if (content.includes('click')) topics.push('clicks');
            if (content.includes('session')) topics.push('sessions');
            if (content.includes('form')) topics.push('forms');
            if (content.includes('feedback')) topics.push('feedback');
            if (content.includes('heatmap')) topics.push('heatmaps');
            if (content.includes('experiment') || content.includes('a/b')) topics.push('experiments');
        }
    }

    const uniqueTopics = [...new Set(topics)];
    if (uniqueTopics.length === 0) {
        return `Earlier in this conversation, user asked ${Math.ceil(history.length / 2)} questions about analytics.`;
    }
    return `Earlier, user asked about: ${uniqueTopics.join(', ')}.`;
}

// Build messages with history limiting
function buildMessages(
    systemPrompt: string,
    message: string,
    contextData?: Record<string, unknown>,
    history?: ChatMessage[]
): ChatMessage[] {
    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt }
    ];

    // Add context data (compact format)
    if (contextData && Object.keys(contextData).length > 0) {
        const compactData = JSON.stringify(contextData);
        messages.push({ role: 'system', content: `Data: ${compactData}` });
    }

    // Handle history with limiting
    if (history && history.length > 0) {
        const relevantHistory = history.filter(m => m.role === 'user' || m.role === 'assistant');

        if (relevantHistory.length > SUMMARIZE_THRESHOLD) {
            // Summarize older messages
            const oldMessages = relevantHistory.slice(0, -MAX_HISTORY_MESSAGES);
            const recentMessages = relevantHistory.slice(-MAX_HISTORY_MESSAGES);

            const summary = summarizeOldHistory(oldMessages);
            messages.push({ role: 'system', content: `Context: ${summary}` });
            messages.push(...recentMessages);
        } else if (relevantHistory.length > MAX_HISTORY_MESSAGES) {
            // Just truncate to recent messages
            messages.push(...relevantHistory.slice(-MAX_HISTORY_MESSAGES));
        } else {
            messages.push(...relevantHistory);
        }
    }

    messages.push({ role: 'user', content: message });
    return messages;
}

// Non-streaming response
async function getAIResponse(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 1024, // Reduced for faster responses
            stream: false,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Groq API error:', error);
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
}

// Streaming response
async function streamAIResponse(messages: ChatMessage[]): Promise<ReadableStream> {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 1024,
            stream: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Groq API error:', error);
        throw new Error(`Groq API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
        async start(controller) {
            if (!reader) {
                controller.close();
                return;
            }

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                controller.close();
                                return;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    controller.enqueue(new TextEncoder().encode(content));
                                }
                            } catch {
                                // Skip invalid JSON
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Stream error:', error);
                controller.error(error);
            } finally {
                controller.close();
            }
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate and get sites
        const authResult = await authenticateUser();
        if (!authResult?.session) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { sites } = authResult;

        // Check for API key
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                { error: 'AI service not configured. Please add GROQ_API_KEY to environment.' },
                { status: 503 }
            );
        }

        // Parse request
        const body: AIRequest = await request.json();
        const { message, context, contextData, history, stream = true } = body;

        if (!message || !context) {
            return NextResponse.json(
                { error: 'Message and context are required' },
                { status: 400 }
            );
        }

        // Build messages with site awareness
        const systemPrompt = getSystemPrompt(context, sites || undefined);
        const messages = buildMessages(systemPrompt, message, contextData, history);

        // Handle streaming vs non-streaming
        if (stream) {
            const streamResponse = await streamAIResponse(messages);
            return new Response(streamResponse, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        } else {
            const response = await getAIResponse(messages);
            return NextResponse.json({ response });
        }
    } catch (error) {
        console.error('AI API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'AI service error' },
            { status: 500 }
        );
    }
}
