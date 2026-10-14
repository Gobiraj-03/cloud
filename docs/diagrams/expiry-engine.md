# License Expiry Classification Workflow

## Overview

AssetFlow implements an on-demand mathematical classification engine for software license subscriptions and hardware warranties. Unlike systems that rely on scheduled cron jobs (which can fail silently, drift, or lock databases), AssetFlow evaluates UTC date boundaries dynamically at query time directly against stored ISO date strings (`YYYY-MM-DD`).

## Mermaid Classification Decision Tree

```mermaid
flowchart TD
    Start(["Input: Stored expiry_date (e.g. '2026-10-31')"]) --> CheckNull{"Is expiry_date NULL / empty?"}
    
    CheckNull -->|Yes| BucketNoExpiry["Bucket: NO_EXPIRY\nUrgency: None\nDays Remaining: null\nPerpetual License"]
    
    CheckNull -->|No| ParseUTC["Parse target expiry date at UTC 00:00:00Z\nParse current reference date at UTC 00:00:00Z"]
    
    ParseUTC --> CalcDiff["Calculate days_remaining:\nMath.round((targetUTC - currentUTC) / (1000 * 60 * 60 * 24))"]
    
    CalcDiff --> CheckExpired{"days_remaining < 0?"}
    
    CheckExpired -->|Yes| BucketExpired["Bucket: EXPIRED\nUrgency: 'expired' (High Danger)\nis_expired: true\nDays Overdue: abs(days_remaining)"]
    
    CheckExpired -->|No| Check7Days{"days_remaining <= 7?"}
    
    Check7Days -->|Yes| Bucket7Days["Bucket: EXPIRING_7_DAYS\nUrgency: 'critical' (High Warning)\nRenewal Deadline Urgent"]
    
    Check7Days -->|No| Check30Days{"days_remaining <= 30?"}
    
    Check30Days -->|Yes| Bucket30Days["Bucket: EXPIRING_30_DAYS\nUrgency: 'warning' (Medium Warning)\nPrepare PO / Budget"]
    
    Check30Days -->|No| BucketValid["Bucket: VALID\nUrgency: 'valid' (Normal/Healthy)\nHealthy Subscription"]

    subgraph ClientViews ["Consumed By Application Interfaces"]
        BucketExpired --> DashboardBadge["Dashboard: Licenses Near Expiry Alert"]
        Bucket7Days --> DashboardBadge
        Bucket30Days --> DashboardBadge
        BucketExpired --> ExpiryTab["Reports Page: License Expiry Tab"]
        Bucket7Days --> ExpiryTab
        Bucket30Days --> ExpiryTab
        BucketValid --> ExpiryTab
        BucketNoExpiry --> ExpiryTab
    end
```

## Boundary Invariants

| Category Bucket | Exact Mathematical Range | Visual Indicator | Urgency Level |
| :--- | :--- | :---: | :---: |
| **`EXPIRED`** | `days_remaining < 0` (strictly prior to today) | Red Badge | `expired` |
| **`EXPIRING_7_DAYS`** | `0 <= days_remaining <= 7` (next 7 calendar days) | Orange Badge | `critical` |
| **`EXPIRING_30_DAYS`** | `8 <= days_remaining <= 30` (days 8 through 30) | Amber Badge | `warning` |
| **`VALID`** | `days_remaining > 30` (greater than 30 days) | Green Badge | `valid` |
| **`NO_EXPIRY`** | `expiry_date IS NULL` | Slate/Blue Badge | `none` |

### Key Architectural Benefit

Because calculations use normalized UTC day-start timestamps (`00:00:00Z`), there is zero discrepancy caused by daylight saving time shifts, browser local timezones, or leap years.
