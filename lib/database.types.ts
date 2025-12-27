export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            rrweb_events: {
                Row: {
                    id: number
                    site_id: string
                    page_path: string
                    session_id: string
                    user_id: string | null
                    visitor_id: string | null
                    events: Json
                    timestamp: string
                    created_at: string | null
                    ip_address: string | null
                    country: string | null
                    user_agent: string | null
                    screen_width: number | null
                    screen_height: number | null
                    language: string | null
                    timezone: string | null
                    referrer: string | null
                    viewport_width: number | null
                    viewport_height: number | null
                    device_pixel_ratio: number | null
                    platform: string | null
                    cookie_enabled: boolean | null
                    online: boolean | null
                    device_type: string | null
                    load_time: number | null
                    dom_ready_time: number | null
                    session_signals: Json | null
                }
                Insert: {
                    id?: number
                    site_id: string
                    page_path: string
                    session_id: string
                    user_id?: string | null
                    visitor_id?: string | null
                    events: Json
                    timestamp: string
                    created_at?: string | null
                    ip_address?: string | null
                    country?: string | null
                    user_agent?: string | null
                    screen_width?: number | null
                    screen_height?: number | null
                    language?: string | null
                    timezone?: string | null
                    referrer?: string | null
                    viewport_width?: number | null
                    viewport_height?: number | null
                    device_pixel_ratio?: number | null
                    platform?: string | null
                    cookie_enabled?: boolean | null
                    online?: boolean | null
                    device_type?: string | null
                    load_time?: number | null
                    dom_ready_time?: number | null
                    session_signals?: Json | null
                }
                Update: {
                    id?: number
                    site_id?: string
                    page_path?: string
                    session_id?: string
                    user_id?: string | null
                    visitor_id?: string | null
                    events?: Json
                    timestamp?: string
                    created_at?: string | null
                    ip_address?: string | null
                    country?: string | null
                    user_agent?: string | null
                    screen_width?: number | null
                    screen_height?: number | null
                    language?: string | null
                    timezone?: string | null
                    referrer?: string | null
                    viewport_width?: number | null
                    viewport_height?: number | null
                    device_pixel_ratio?: number | null
                    platform?: string | null
                    cookie_enabled?: boolean | null
                    online?: boolean | null
                    device_type?: string | null
                    load_time?: number | null
                    dom_ready_time?: number | null
                    session_signals?: Json | null
                }
            }
            snapshots: {
                Row: {
                    id: number
                    site_id: string
                    page_path: string
                    device_type: string
                    storage_path: string
                    resolution_width: number
                    resolution_height: number
                    content_hash: string | null
                    is_compressed: boolean
                    updated_at: string
                    created_at: string
                }
                Insert: {
                    id?: number
                    site_id: string
                    page_path: string
                    device_type: string
                    storage_path: string
                    resolution_width: number
                    resolution_height: number
                    content_hash?: string | null
                    is_compressed?: boolean
                    updated_at?: string
                    created_at?: string
                }
                Update: {
                    id?: number
                    site_id?: string
                    page_path?: string
                    device_type?: string
                    storage_path?: string
                    resolution_width?: number
                    resolution_height?: number
                    content_hash?: string | null
                    is_compressed?: boolean
                    updated_at?: string
                    created_at?: string
                }
            }
            sites: {
                Row: {
                    id: string
                    user_id: string
                    domain: string
                    settings: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    domain: string
                    settings?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    domain?: string
                    settings?: Json | null
                    created_at?: string
                }
            }
        }
        Views: {
            sessions_view: {
                Row: {
                    session_id: string
                    site_id: string
                    visitor_id: string | null
                    started_at: string | null
                    ended_at: string | null
                    duration: number | null
                    page_views: number | null
                    pages: string[] | null
                    country: string | null
                    ip_address: string | null
                    device_type: string | null
                    platform: string | null
                    user_agent: string | null
                    screen_width: number | null
                    screen_height: number | null
                    signals: Json | null
                }
            }
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
