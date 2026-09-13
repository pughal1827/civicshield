# Phase 7D.2 — Civic Hotspot Detection Engine Design

## 1. Executive Summary & Product Purpose
CivicShield AI evolves from incident reporting to **Civic Incident Intelligence & Resolution Platform**. The purpose of Phase 7D.2 is to implement a deterministic, database-backed **Civic Hotspot Detection Engine** that identifies geographic areas with high concentrations of active civic incidents.

A hotspot is **NOT** a duplicate report, nor is it a single master incident. A hotspot is a spatial-temporal cluster of multiple distinct active master incidents within a specified radius (e.g. 500 meters) and time window (e.g. last 7 days).

---

## 2. Audit of Existing Location & Database Model

### Existing Schema & Entity Relationships
1. **Incidents Table (`incidents`)**:
   - Primary entity for master incidents (`id`, `case_id`, `latitude`, `longitude`, `category`, `priority_score`, `priority_tier`, `department_id`, `status`, `created_at`, `master_incident_id`, `is_duplicate_flagged`).
   - Active Incident Statuses: `SUBMITTED`, `AI_ANALYSED`, `ASSIGNED`, `IN_PROGRESS`, `CITIZEN_VERIFICATION`.
   - Excluded Statuses: `RESOLVED`, `VERIFIED` (closed/resolved issues do not constitute active hotspots).
2. **Citizen Reports Table (`reports`)**:
   - Individual citizen submissions attached to incidents (`id`, `incident_id`, `citizen_id`, `latitude`, `longitude`, `created_at`).
   - Multiple citizen reports can be linked to 1 master incident.
3. **Duplicate Relations Table (`duplicate_relations`)**:
   - Relationships between candidate incidents and target incidents (`status`: `PENDING`, `CONFIRMED`, `REJECTED`).
   - `CONFIRMED` relations mean candidate incidents are merged into master incidents (`master_incident_id` set).
   - `PENDING` candidates remain separate active incidents until human authority confirmation.
   - `REJECTED` candidate relations remain separate independent incidents.

### Incident vs Citizen Report Counting Rule
- **Master Incident Count (`incidentCount`)**: Count of distinct primary master incidents (`master_incident_id IS NULL`).
- **Citizen Report Count (`citizenReportCount`)**: Total number of citizen report submissions associated with those master incidents.
- **Rule**: 1 master incident with 8 attached citizen reports counts as `incidentCount: 1` and `citizenReportCount: 8`. This prevents double-counting duplicate citizen reports as separate civic problems in spatial clusters.

---

## 3. Hotspot Engine Configuration & Parameters

Default configuration constants are centralized in `HOTSPOT_CONFIG`:

```typescript
export const HOTSPOT_CONFIG = {
  DEFAULT_TIME_WINDOW_DAYS: 7,
  MIN_TIME_WINDOW_DAYS: 1,
  MAX_TIME_WINDOW_DAYS: 90,

  DEFAULT_RADIUS_METERS: 500,
  MIN_RADIUS_METERS: 50,
  MAX_RADIUS_METERS: 2000,

  DEFAULT_MIN_INCIDENTS: 3,
  MIN_MIN_INCIDENTS: 2,
  MAX_MIN_INCIDENTS: 100,

  ACTIVE_STATUSES: [
    'SUBMITTED',
    'AI_ANALYSED',
    'ASSIGNED',
    'IN_PROGRESS',
    'CITIZEN_VERIFICATION'
  ]
};
```

---

## 4. Deterministic Spatial Clustering Algorithm

### Step-by-Step Clustering Workflow
1. **Retrieve Eligible Incidents**:
   - Query primary active incidents (`master_incident_id IS NULL` and `status IN ACTIVE_STATUSES`) created within the specified time window (e.g., last 7 days).
2. **Validate Coordinates**:
   - Reject records with missing or out-of-bounds coordinates (Lat: [-90, +90], Lng: [-180, +180]).
3. **Density-Based Neighborhood Grouping**:
   - For each incident $i$, find all neighboring eligible incidents $j$ within `RADIUS_METERS` using Haversine distance:
     $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
4. **Cluster Formation & Centroid Calculation**:
   - Candidate clusters meeting $\ge \text{MIN\_INCIDENTS}$ are identified.
   - Centroid calculation:
     $$\text{latitude}_{\text{center}} = \frac{1}{N} \sum_{i=1}^{N} \text{latitude}_i, \quad \text{longitude}_{\text{center}} = \frac{1}{N} \sum_{i=1}^{N} \text{longitude}_i$$
   - Radius calculation: `radiusMeters = max(Haversine(center, incident_i))` for all incidents in the cluster.
5. **Cluster Deduplication & Boundary Merging**:
   - Overlapping centroids within `RADIUS_METERS` are merged into single unified hotspots to prevent duplicate hotspot bubbles for the same physical area.
6. **Hotspot Metrics & Category/Department Breakdown**:
   - Calculate `incidentCount`, `citizenReportCount`, `activeCount`, priority breakdown (`criticalCount`, `highCount`, `mediumCount`, `lowCount`), `topCategories`, `topDepartment`, `hotspotType` (`ROAD_HOTSPOT`, `DRAINAGE_HOTSPOT`, `GARBAGE_HOTSPOT`, `MIXED_CIVIC_HOTSPOT`), and period-over-period `trend`.
7. **Detection Strength**:
   - Derived deterministically based on incident density and recency (e.g. `HIGH` for $\ge 5$ incidents or critical issues, `MEDIUM` for 3-4 incidents).

---

## 5. Failure Handling, Storage Modes & Privacy
- **Production Mode (`CIVICSHIELD_STORAGE_MODE=supabase`)**:
  - Database error or network failure yields `HTTP 503 Service Unavailable`.
  - Never silently fallback to mock store or return false empty `[]` hotspots during database failure.
- **Explicit Demo Mode (`CIVICSHIELD_STORAGE_MODE=mock`)**:
  - Hotspots calculated dynamically from mock store records using the exact same deterministic clustering algorithm.
- **Privacy & Security**:
  - RBAC: Endpoint `GET /api/authority/intelligence/hotspots` restricted strictly to `AUTHORITY` and `ADMIN` roles (returns `HTTP 403 Forbidden` for citizens).
  - No PII (names, emails, tracking codes, exact home addresses) exposed in hotspot payloads.
