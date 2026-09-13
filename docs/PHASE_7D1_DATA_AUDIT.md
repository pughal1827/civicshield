# Phase 7D.1 — Civic Intelligence Data Foundation Audit

**Project:** CivicShield AI  
**Audit Date:** September 9, 2026  

---

## 1. Existing Database Schema & Entity Inventory

CivicShield AI currently maintains 8 core entity tables in Postgres/Supabase and mockStore:

1. **`departments`**:
   - Primary Key: `id` (UUID)
   - Core Fields: `code` (e.g. `ROAD_MAINT`), `name` (e.g. `Road Maintenance`), `description`
   - Timestamps: `created_at`

2. **`users`**:
   - Primary Key: `id` (UUID / text)
   - Core Fields: `email`, `full_name`, `role` (`CITIZEN` | `AUTHORITY` | `ADMIN`), `department_id`
   - Security: Password hashes (scrypt format `scrypt$<salt>$<hash>`) stored server-side.

3. **`incidents`** (Master Incidents):
   - Primary Key: `id` (UUID)
   - Unique Identifiers: `case_id` (e.g. `CS-1042`)
   - Core Metrics: `category` (enum), `severity` (enum), `status` (enum), `priority_score` (0-100), `priority_factors` (JSONB breakdown)
   - Geographic Coordinates: `latitude` (FLOAT), `longitude` (FLOAT), `address` (TEXT)
   - Workload & Master Linking: `department_id`, `assigned_officer_id`, `master_incident_id` (self-referencing FK for merged incidents), `report_count`, `affected_citizens_count`, `is_duplicate_flagged`
   - Timestamps: `created_at`, `updated_at`, `resolved_at`

4. **`reports`** (Citizen Complaints):
   - Primary Key: `id` (UUID)
   - Foreign Key: `incident_id` -> `incidents.id`
   - Identification: `tracking_code` (unique tracking UUID/hex), `reporter_id` (optional user ID)
   - Content: `raw_description`, `image_url`, `latitude`, `longitude`, `address_text`, `is_original_report`
   - Timestamps: `created_at`

5. **`ai_analyses`**:
   - Primary Key: `id` (UUID)
   - Foreign Key: `incident_id` -> `incidents.id`
   - Outputs: `confidence_score` (0.0-1.0), `detected_category`, `detected_severity`, `suggested_department_code`, `extracted_features` (JSONB)
   - Timestamps: `created_at`

6. **`duplicate_relations`**:
   - Primary Key: `id` (UUID)
   - Foreign Keys: `target_incident_id`, `candidate_incident_id` -> `incidents.id`
   - Metrics: `similarity_score` (0.0-1.0), `distance_meters` (FLOAT)
   - Human Triage: `status` (`PENDING` | `CONFIRMED` | `REJECTED`), `reviewed_by`, `reviewed_at`
   - Timestamps: `created_at`

7. **`resolution_evidence`**:
   - Primary Key: `id` (UUID)
   - Foreign Key: `incident_id` -> `incidents.id`
   - Evidence: `officer_id`, `proof_image_url`, `resolution_notes`, `citizen_verified` (BOOLEAN), `citizen_feedback` (TEXT)
   - Timestamps: `created_at`

8. **`audit_logs`**:
   - Primary Key: `id` (UUID)
   - Foreign Key: `incident_id` -> `incidents.id`
   - Traceability: `performed_by`, `action` (e.g. `CONFIRM_MERGE`, `STATUS_UPDATE`, `DEPARTMENT_OVERRIDE`), `old_value` (JSONB), `new_value` (JSONB), `reason` (TEXT)
   - Timestamps: `created_at`

---

## 2. Intelligence Foundation Assessment

### A. Source of Truth & Fail-Safe Strategy
- In **Production Mode** (`CIVICSHIELD_STORAGE_MODE=supabase` or `CIVICSHIELD_MODE=production`), Supabase Postgres is the single source of truth.
- Database connectivity failures will return explicit `503 Service Unavailable` or `500 Internal Error` responses rather than silently falling back to mock storage or returning `0 incidents`.
- In **Demo Mode** (`CIVICSHIELD_STORAGE_MODE=mock` or `CIVICSHIELD_MODE=demo`), calculations execute against the seeded mock dataset.

### B. Incident Count vs Report Count Distinction
- **1 Master Incident** can encapsulate **N Citizen Reports**.
- Intelligence aggregations strictly distinguish between:
  - `incidentCount`: Number of physical civic problem records.
  - `reportCount`: Total volume of citizen complaint submissions.
- Candidate duplicate relations in `PENDING` or `REJECTED` status do **not** decrease incident counts; only `CONFIRMED` merged relations contribute to report consolidation.

### C. Geographic & Coordinate Integrity
- Validates latitude $\in [-90.0, +90.0]$ and longitude $\in [-180.0, +180.0]$.
- Standardizes PostGIS point ordering: `POINT(longitude latitude)` (X=lng, Y=lat).
- Reuses existing `latitude` and `longitude` fields across `incidents` and `reports` without duplicating fields.

### D. Time Window Standardization
- Standardizes UTC timestamp filtering across server-side analytics.
- Server-side time utilities support:
  - `today` (00:00:00 UTC to present)
  - `yesterday` (Previous full day UTC)
  - `last7Days` (Trailing 7-day rolling window)
  - `last30Days` (Trailing 30-day rolling window)
  - `previous7Days` (Days -14 to -7 comparison baseline)
  - `previous30Days` (Days -60 to -30 comparison baseline)
  - `currentMonth` & `previousMonth`

### E. Safe Trend & Percentage Calculations
- Percentage change formula:  
  $$\text{Percentage Change} = \frac{\text{Current Period} - \text{Previous Period}}{\text{Previous Period}} \times 100$$
- **Zero Baseline Handling**: When `previousCount === 0`, `percentageChange` returns `null` with a clear explanation (`"No previous-period baseline"`), preventing `Infinity` or `NaN` outputs.

---

## 3. Recommended Indexes for Database Optimization

To support high-performance spatial and temporal aggregations in Postgres/Supabase:

1. **Temporal Indexes**:
   - `idx_incidents_created_at` ON `incidents(created_at DESC)`
   - `idx_reports_created_at` ON `reports(created_at DESC)`
2. **Category & Status Composite Indexes**:
   - `idx_incidents_status_category` ON `incidents(status, category)`
   - `idx_incidents_dept_status` ON `incidents(department_id, status)`
3. **Geographic Spatial Index**:
   - PostGIS GIST index on `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)` for radius & hotspot queries.

---

## 4. Migration & API Architecture
- Core Intelligence types and utilities will be structured under `lib/intelligence/`:
  - `lib/intelligence/types.ts`: Strongly-typed interfaces for intelligence metrics.
  - `lib/intelligence/time-windows.ts`: Reusable time-window boundary generators.
  - `lib/intelligence/trends.ts`: Zero-safe trend & change calculators.
  - `lib/intelligence/aggregations.ts`: Server-side database aggregation services.
  - `app/api/authority/intelligence/overview/route.ts`: Authority-restricted overview API endpoint.
