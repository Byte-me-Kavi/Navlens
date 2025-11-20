# ClickHouse Query Examples with Parameter Substitution

This document shows the actual ClickHouse queries executed by the heatmap application, with parameters substituted for debugging purposes.

## Element Clicks Query (/api/element-clicks)

**Template Query:**

```sql
SELECT
  element_selector as selector,
  element_tag as tag,
  element_text as text,
  element_id,
  element_classes,
  round(avg(x), 2) as x,
  round(avg(y), 2) as y,
  count(*) as click_count
FROM events
WHERE site_id = {siteId:String}
  AND page_path = {pagePath:String}
  AND device_type = {deviceType:String}
  AND event_type = 'click'
  AND timestamp >= {startDate:DateTime}
  AND timestamp <= {endDate:DateTime}
  AND element_selector != ''
GROUP BY
  element_selector,
  element_tag,
  element_text,
  element_id,
  element_classes
ORDER BY click_count DESC
```

**Example with Substituted Parameters:**

```sql
SELECT
  element_selector as selector,
  element_tag as tag,
  element_text as text,
  element_id,
  element_classes,
  round(avg(x), 2) as x,
  round(avg(y), 2) as y,
  count(*) as click_count
FROM events
WHERE site_id = '10104f75-c77f-4851-ab22-d9bf99ce2ff2'
  AND page_path = '/'
  AND device_type = 'desktop'
  AND event_type = 'click'
  AND timestamp >= '2025-10-21 00:00:00'
  AND timestamp <= '2025-11-20 00:00:00'
  AND element_selector != ''
GROUP BY
  element_selector,
  element_tag,
  element_text,
  element_id,
  element_classes
ORDER BY click_count DESC
```

## Heatmap Clicks Query (/api/heatmap-clicks)

**Template Query:**

```sql
SELECT
  round(x / 2) * 2 as x,
  round(y / 2) * 2 as y,
  count(*) as value
FROM events
WHERE site_id = {siteId:String}
  AND page_path = {pagePath:String}
  AND (device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} = 'desktop'))
  AND event_type = 'click'
  AND timestamp >= subtractDays(now(), 30)
GROUP BY x, y
ORDER BY value DESC
LIMIT 5000
```

**Example with Substituted Parameters:**

```sql
SELECT
  round(x / 2) * 2 as x,
  round(y / 2) * 2 as y,
  count(*) as value
FROM events
WHERE site_id = '10104f75-c77f-4851-ab22-d9bf99ce2ff2'
  AND page_path = '/'
  AND (device_type = 'desktop' OR (device_type = '' AND 'desktop' = 'desktop'))
  AND event_type = 'click'
  AND timestamp >= subtractDays(now(), 30)
GROUP BY x, y
ORDER BY value DESC
LIMIT 5000
```

## API Endpoints

### POST /api/element-clicks

- **Method:** POST
- **Body:**
  ```json
  {
    "siteId": "10104f75-c77f-4851-ab22-d9bf99ce2ff2",
    "pagePath": "/",
    "deviceType": "desktop",
    "startDate": "2025-10-21T00:00:00.000Z",
    "endDate": "2025-11-20T00:00:00.000Z"
  }
  ```
- **Response:** Array of element click objects with centroids and metadata

### GET /api/heatmap-clicks

- **Method:** GET
- **Query Parameters:**
  - `siteId=10104f75-c77f-4851-ab22-d9bf99ce2ff2`
  - `pagePath=/`
  - `deviceType=desktop`
- **Response:** Object with `clicks` array containing heatmap points

## Notes

- Element clicks query supports custom date ranges via POST body
- Heatmap clicks query uses fixed 30-day window with `subtractDays(now(), 30)`
- Both queries filter out empty element selectors
- Element clicks are grouped by selector and include centroid calculations
- Heatmap clicks are binned to 2-pixel precision to reduce data volume
