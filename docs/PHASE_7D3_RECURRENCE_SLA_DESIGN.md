# Phase 7D.3 — Recurring Civic Problem & SLA Monitoring Engine Design

## 1. Executive Summary & Product Purpose
Phase 7D.3 adds two essential intelligence engines to the CivicShield AI platform:
1. **Recurring Civic Problem Engine**: Detects geographic locations where similar civic issues (e.g. potholes, water leakage, drainage blockages) repeatedly occur over a historical lookback window (e.g. 180 days).
2. **SLA Monitoring Engine**: Computes service level agreement targets based on incident priority tier (`CRITICAL` = 4h, `HIGH` = 24h, `MEDIUM` = 72h, `LOW` = 168h), tracking real-time resolution deadlines (`ON_TRACK`, `AT_RISK`, `BREACHED`, `NOT_APPLICABLE`).

---

## 2. Audit of Existing Data & Schema

### Incident Schema & Timestamps
- `incidents` table contains: `id`, `case_id`, `latitude`, `longitude`, `category`, `priority_score`, `priority_tier`, `department_id`, `status`, `created_at`, `updated_at`, `master_incident_id`, `assigned_at`, `resolved_at`, `verified_at`.
- Lifecycle statuses: `SUBMITTED`, `AI_ANALYSED`, `ASSIGNED`, `IN_PROGRESS`, `CITIZEN_VERIFICATION`, `RESOLVED`, `VERIFIED`.

### Recurrence vs Hotspot vs Duplicate Detection
- **Duplicate Detection**: "Are these incoming reports describing the same *current* physical issue?" (Immediate matching within 100m).
- **Hotspot Engine**: "Where are *active* incidents currently spatially concentrated?" (Active status only, 500m radius, 7-day window).
- **Recurrence Engine**: "Has a similar civic problem repeatedly appeared near this location over historical time?" (Includes resolved & active incidents, same category, 250m radius, 180-day lookback).

---

## 3. Recurring Civic Problem Engine Specification

### Centralized Configuration
```typescript
export const RECURRENCE_CONFIG = {
  DEFAULT_LOOKBACK_DAYS: 180,
  MIN_LOOKBACK_DAYS: 30,
  MAX_LOOKBACK_DAYS: 365,

  DEFAULT_RADIUS_METERS: 250,
  MIN_RADIUS_METERS: 50,
  MAX_RADIUS_METERS: 1000,

  DEFAULT_MIN_OCCURRENCES: 3,
  MIN_MIN_OCCURRENCES: 2,
  MAX_MIN_OCCURRENCES: 50,
};
```

### Recurrence Rules & Master Incident Identity
- **Occurrence Counting**: Count of distinct primary master incidents (`master_incident_id IS NULL`).
- Confirmed duplicate reports (`master_incident_id` set) do **NOT** count as separate occurrences.
- Pending duplicate candidates remain separate occurrences until human confirmation.
- Category matching: Only incidents sharing the same category (e.g. `ROAD_POTHOLE`) are grouped into recurrence candidates.
- Resolved and active incidents both contribute to historical recurrence count.

### Recurrence Output Schema
- `recurrenceId`: Deterministic ID (`rec_${category}_${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`).
- `center`: Average centroid (`latitude`, `longitude`).
- `radiusMeters`: Max distance from center.
- `category`: Civic category.
- `occurrenceCount`: Total unique master incidents.
- `firstOccurrence`: ISO timestamp of earliest incident.
- `lastOccurrence`: ISO timestamp of most recent incident.
- `daysSinceLastOccurrence`: Integer days elapsed since most recent occurrence.
- `averageDaysBetweenOccurrences`: Average interval between occurrences.
- `activeOccurrenceCount`, `resolvedOccurrenceCount`, `verifiedOccurrenceCount`.
- `recurrenceStrength`: `LOW`, `MODERATE`, `STRONG`.
- `trend`: Zero-safe trend comparison relative to previous lookback period.

---

## 4. SLA Monitoring Engine Specification

### Centralized SLA Duration Targets
```typescript
export const SLA_CONFIG = {
  DURATIONS_HOURS: {
    CRITICAL: 4,     // 4 Hours
    HIGH: 24,        // 24 Hours
    MEDIUM: 72,      // 72 Hours (3 Days)
    LOW: 168,        // 168 Hours (7 Days)
  },
  AT_RISK_THRESHOLD_PERCENT: 25, // Remaining time <= 25% triggers AT_RISK
};
```

### SLA Lifecycle Rules
- **SLA Start Time**:
  - Preferred: `assigned_at` (or timestamp when status transitioned to `ASSIGNED`).
  - Fallback: `created_at` if `assigned_at` is missing.
- **SLA Deadline**: $\text{Deadline} = \text{SLA\_Start} + \text{SLA\_Duration\_Hours}$.
- **Eligible Statuses**: `SUBMITTED`, `AI_ANALYSED`, `ASSIGNED`, `IN_PROGRESS`, `CITIZEN_VERIFICATION`, `RESOLVED`.
- **Excluded Statuses**: `VERIFIED` (Fully verified and closed issues -> `NOT_APPLICABLE`).

### SLA Status Logic
1. `BREACHED`: Current UTC time > Deadline (Elapsed > Total SLA Duration). Remaining seconds = 0, Progress = 100%.
2. `AT_RISK`: Remaining time $\le 25\%$ of total SLA duration.
3. `ON_TRACK`: Remaining time $> 25\%$ of total SLA duration.
4. `NOT_APPLICABLE`: Completed (`VERIFIED`) or unassigned without SLA tracking.

---

## 5. Security, Privacy & Error Handling
- **RBAC**: APIs `GET /api/authority/intelligence/recurring` and `GET /api/authority/intelligence/sla` are restricted to `AUTHORITY` and `ADMIN` session roles (returns `403 Forbidden` for citizens).
- **Privacy**: Aggregate metrics only. Zero citizen PII (email, phone, tracking code) exposed.
- **Fail-Safe Mode**: Database or network failures yield `HTTP 503 Service Unavailable`.
