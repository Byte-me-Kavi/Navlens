-- SQL Queries to Insert Test Frustration Data into ClickHouse

-- IMPORTANT: Replace 'YOUR_SITE_ID' with your actual site_id
-- You can find your site_id in the dashboard or from existing events

-- Example site_id from the logs: 10104f75-c77f-4851-ab22-d9bf99ce2ff2

-- 1. Insert Dead Click Events (clicks that didn't trigger expected actions)
INSERT INTO events (
    site_id, event_id, event_type, timestamp, x, y, x_relative, y_relative,
    scroll_depth, page_url, page_path, referrer, user_agent, user_language,
    viewport_width, viewport_height, screen_width, screen_height, device_type,
    element_id, element_classes, element_tag, element_text, element_selector,
    session_id, client_id, load_time, variant_id, document_width, document_height,
    element_href, is_interactive, is_dead_click, click_count, ip_address, user_id, created_at
)
VALUES
    -- Session 1: High frustration (5 dead clicks, 2 rage clicks)
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_dead1', 'click', now() - INTERVAL 2 HOUR, 
     450, 200, 0.45, 0.2, 15, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'submit-btn', 'btn primary', 'button', 'Submit', 'button#submit-btn',
     'sess_frustrated_001', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 1250, '', 1920, 3000,
     '', true, true, 1, '192.168.1.1', '', now() - INTERVAL 2 HOUR),
     
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_dead2', 'click', now() - INTERVAL 2 HOUR + INTERVAL 5 SECOND, 
     450, 200, 0.45, 0.2, 15, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'submit-btn', 'btn primary', 'button', 'Submit', 'button#submit-btn',
     'sess_frustrated_001', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 1250, '', 1920, 3000,
     '', true, true, 1, '192.168.1.1', '', now() - INTERVAL 2 HOUR + INTERVAL 5 SECOND),
     
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_dead3', 'click', now() - INTERVAL 2 HOUR + INTERVAL 15 SECOND, 
     320, 450, 0.32, 0.45, 25, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'link-broken', 'nav-link', 'a', 'Learn More', 'a.nav-link',
     'sess_frustrated_001', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 1250, '', 1920, 3000,
     '#learn-more', true, true, 1, '192.168.1.1', '', now() - INTERVAL 2 HOUR + INTERVAL 15 SECOND),
     
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_dead4', 'click', now() - INTERVAL 2 HOUR + INTERVAL 25 SECOND, 
     680, 890, 0.68, 0.89, 50, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'download-btn', 'btn secondary', 'button', 'Download', 'button#download-btn',
     'sess_frustrated_001', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 1250, '', 1920, 3000,
     '', true, true, 1, '192.168.1.1', '', now() - INTERVAL 2 HOUR + INTERVAL 25 SECOND),
     
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_dead5', 'click', now() - INTERVAL 2 HOUR + INTERVAL 35 SECOND, 
     520, 670, 0.52, 0.67, 60, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'modal-close', 'close-btn', 'button', 'X', 'button.close-btn',
     'sess_frustrated_001', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 1250, '', 1920, 3000,
     '', true, true, 1, '192.168.1.1', '', now() - INTERVAL 2 HOUR + INTERVAL 35 SECOND);

-- 2. Insert Rage Click Events (rapid repeated clicks on same element)
INSERT INTO events (
    site_id, event_id, event_type, timestamp, x, y, x_relative, y_relative,
    scroll_depth, page_url, page_path, referrer, user_agent, user_language,
    viewport_width, viewport_height, screen_width, screen_height, device_type,
    element_id, element_classes, element_tag, element_text, element_selector,
    session_id, client_id, load_time, variant_id, document_width, document_height,
    element_href, is_interactive, is_dead_click, click_count, ip_address, user_id, created_at
)
VALUES
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_rage1', 'rage_click', now() - INTERVAL 2 HOUR + INTERVAL 45 SECOND, 
     450, 200, 0.45, 0.2, 15, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'submit-btn', 'btn primary', 'button', 'Submit', 'button#submit-btn',
     'sess_frustrated_001', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 1250, '', 1920, 3000,
     '', true, false, 5, '192.168.1.1', '', now() - INTERVAL 2 HOUR + INTERVAL 45 SECOND),
     
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_rage2', 'rage_click', now() - INTERVAL 2 HOUR + INTERVAL 55 SECOND, 
     320, 450, 0.32, 0.45, 25, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'link-broken', 'nav-link', 'a', 'Learn More', 'a.nav-link',
     'sess_frustrated_001', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 1250, '', 1920, 3000,
     '#learn-more', true, false, 6, '192.168.1.1', '', now() - INTERVAL 2 HOUR + INTERVAL 55 SECOND);

-- 3. Insert Medium Frustration Session (2 dead clicks, 1 rage click)
INSERT INTO events (
    site_id, event_id, event_type, timestamp, x, y, x_relative, y_relative,
    scroll_depth, page_url, page_path, referrer, user_agent, user_language,
    viewport_width, viewport_height, screen_width, screen_height, device_type,
    element_id, element_classes, element_tag, element_text, element_selector,
    session_id, client_id, load_time, variant_id, document_width, document_height,
    element_href, is_interactive, is_dead_click, click_count, ip_address, user_id, created_at
)
VALUES
    -- Session 2: Medium frustration
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_med1', 'click', now() - INTERVAL 1 HOUR, 
     550, 300, 0.55, 0.3, 20, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'search-btn', 'btn', 'button', 'Search', 'button#search-btn',
     'sess_medium_002', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 980, '', 1920, 2500,
     '', true, true, 1, '192.168.1.2', '', now() - INTERVAL 1 HOUR),
     
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_med2', 'click', now() - INTERVAL 1 HOUR + INTERVAL 10 SECOND, 
     670, 540, 0.67, 0.54, 35, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'filter-btn', 'btn outline', 'button', 'Filter', 'button#filter-btn',
     'sess_medium_002', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 980, '', 1920, 2500,
     '', true, true, 1, '192.168.1.2', '', now() - INTERVAL 1 HOUR + INTERVAL 10 SECOND),
     
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_med3', 'rage_click', now() - INTERVAL 1 HOUR + INTERVAL 20 SECOND, 
     550, 300, 0.55, 0.3, 20, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'search-btn', 'btn', 'button', 'Search', 'button#search-btn',
     'sess_medium_002', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 980, '', 1920, 2500,
     '', true, false, 4, '192.168.1.2', '', now() - INTERVAL 1 HOUR + INTERVAL 20 SECOND);

-- 4. Insert Low Frustration Session (1 dead click only)
INSERT INTO events (
    site_id, event_id, event_type, timestamp, x, y, x_relative, y_relative,
    scroll_depth, page_url, page_path, referrer, user_agent, user_language,
    viewport_width, viewport_height, screen_width, screen_height, device_type,
    element_id, element_classes, element_tag, element_text, element_selector,
    session_id, client_id, load_time, variant_id, document_width, document_height,
    element_href, is_interactive, is_dead_click, click_count, ip_address, user_id, created_at
)
VALUES
    -- Session 3: Low frustration
    ('10104f75-c77f-4851-ab22-d9bf99ce2ff2', 'evt_test_low1', 'click', now() - INTERVAL 30 MINUTE, 
     420, 820, 0.42, 0.82, 75, 
     'https://example.com/', '/', '', 
     'Mozilla/5.0', 'en-US', 1920, 1080, 1920, 1080, 'desktop',
     'contact-link', 'footer-link', 'a', 'Contact Us', 'a.footer-link',
     'sess_low_003', '10104f75-c77f-4851-ab22-d9bf99ce2ff2', 750, '', 1920, 3200,
     '/contact', true, true, 1, '192.168.1.3', '', now() - INTERVAL 30 MINUTE);

-- Verify the data was inserted
SELECT 
    session_id,
    countIf(is_dead_click = true) as dead_clicks,
    countIf(event_type = 'rage_click') as rage_clicks,
    count(*) as total_events
FROM events
WHERE site_id = '10104f75-c77f-4851-ab22-d9bf99ce2ff2'
    AND page_path = '/'
    AND timestamp >= now() - INTERVAL 3 HOUR
GROUP BY session_id
ORDER BY (dead_clicks + rage_clicks) DESC;
