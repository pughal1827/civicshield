# Phase 7D.2 — Civic Hotspot Detection Engine

## 1. Algorithm Overview
The **Civic Hotspot Detection Engine** implements a deterministic density-based spatial clustering algorithm on active master incidents.

```
Active Primary Incidents (Last N Days)
   │
   ├── Geographic Bounds Validation (Lat: [-90, +90], Lng: [-180, +180])
   ├── Distance Matrix Computation via Haversine Formula
   ├── Density Neighborhood Grouping (Dist ≤ Search Radius)
   ├── Centroid & Max Radius Calculation
   ├── Overlapping Cluster Merging & Deduplication
   └── Hotspot Item Generation (Category, Dept, Severity, Detection Strength, Trend)
```

---

## 2. Configuration & Defaults
Hotspot detection parameters are governed by standard default constants with strict server-side sanitization:

```typescript
export const HOTSPOT_CONFIG = {
  DEFAULT_TIME_WINDOW_DAYS: 7,   // Configurable: 1–90 days
  DEFAULT_RADIUS_METERS: 500,    // Configurable: 50–2000 meters
  DEFAULT_MIN_INCIDENTS: 3,      // Configurable: 2–100 incidents
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

## 3. Incident vs Report Distinction & Duplicate Handling
- **Master Incident Count (`incidentCount`)**: Number of distinct primary master incidents in the cluster (`master_incident_id IS NULL`).
- **Citizen Report Count (`citizenReportCount`)**: Sum of all citizen submissions attached to those master incidents.
- **Confirmed Duplicates**: Merged into master incidents (`master_incident_id` set). They attach their report count to the master incident and do **NOT** inflate master incident count.
- **Pending Duplicate Candidates**: Retain `master_incident_id = null` and remain separate active master incidents until confirmed by human authority.
- **Rejected Duplicates**: Retain `master_incident_id = null` and remain separate active master incidents.

---

## 4. Geometric & Spatial Calculations
1. **Centroid Center**: Mean latitude and mean longitude of cluster members:
   $$\text{Lat}_{\text{center}} = \frac{1}{N} \sum_{i=1}^N \text{Lat}_i, \quad \text{Lng}_{\text{center}} = \frac{1}{N} \sum_{i=1}^N \text{Lng}_i$$
2. **Cluster Radius (`radiusMeters`)**: Maximum distance from `center` to any cluster member:
   $$\text{radiusMeters} = \max_{i=1\dots N} \text{Haversine}(\text{center}, \text{point}_i)$$
3. **Haversine Distance**:
   $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

---

## 5. Trend Analysis & Zero Baseline Handling
Period-over-period trend compares current period incident count ($N_{\text{current}}$) within hotspot radius against previous period count ($N_{\text{previous}}$) at the same spatial location.

- When $N_{\text{previous}} > 0$:
  $$\text{percentageChange} = \frac{N_{\text{current}} - N_{\text{previous}}}{N_{\text{previous}}} \times 100\%$$
- When $N_{\text{previous}} = 0$:
  $$\text{percentageChange} = \text{null}$$
  $$\text{explanation} = \text{"+N incident(s) in current period (No previous-period baseline)."}$$

No `Infinity` or `NaN` values are ever produced.

---

## 6. Privacy & Security
- **Server-Side RBAC**: API endpoint `GET /api/authority/intelligence/hotspots` enforces `AUTHORITY` / `ADMIN` authentication. Unauthenticated requests receive `401 Unauthorized`; Citizen role receives `403 Forbidden`.
- **PII Isolation**: Hotspots output aggregated spatial statistics only. No citizen email addresses, passwords, phone numbers, tracking secrets, or exact home addresses are exposed.

---

## 7. Performance & Database Failure Handling
- **Database Indexing**: Recommended PostGIS GiST spatial index `idx_incidents_location_gist` and temporal B-Tree index `idx_incidents_created_at`.
- **Fail-Safe Mode (`CIVICSHIELD_STORAGE_MODE=supabase`)**: Database or network failures yield `HTTP 503 Service Unavailable` with a clear user notice.
- **Explicit Demo Mode (`CIVICSHIELD_STORAGE_MODE=mock`)**: Uses `mockStore` records for demonstration.
