# CivicShield AI — Platform Overview & Technical Blueprint

**Project Title**: CIVICSHIELD AI: AI-Powered Civic Issue Detection, Prioritization & Resolution Platform  
**System Architecture**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL, pgvector), Google Gemini 2.5 Flash, text-embedding-004.

---

## 1. Executive Summary

Municipal administrations face massive friction in complaint management portals. Thousands of citizens submit unorganized, duplicate reports describing the exact same broken streetlight or pothole using different words. Complaints are processed on a First-In-First-Out (FIFO) basis regardless of danger level, misrouted across siloed departments, and closed without verifiable proof.

**CivicShield AI** solves this bottleneck by operating as an intelligent issue transformation platform. It ingests multi-modal citizen inputs (text, photos, locations), extracts structured metadata via Google Gemini AI, identifies semantic and geographic duplicates using vector embeddings and spatial distance, computes an explainable 5-factor priority score, routes work orders to municipal departments, and enables citizens to verify completed repairs.

---

## 2. Core Workflow Architecture

```
REPORT
  ↓
UNDERSTAND (Multi-modal AI Vision & Text Classification)
  ↓
DETECT DUPLICATE (Vector Cosine Distance + Haversine Radius Search)
  ↓
PRIORITIZE (5-Factor Weighted Score: Safety 30%, Impact 25%, Severity 20%, Recurrence 15%, Location 10%)
  ↓
ROUTE & ASSIGN (Department mapping with manual authority override)
  ↓
TRACK (Public status timeline via secure UUID tracking code)
  ↓
RESOLVE (Field officer uploads proof of repair photo)
  ↓
VERIFY (Citizen confirms resolution or reopens work order)
```

---

## 3. Key Innovations & Technical Modules

### A. Dual-Signal Duplicate Detection Engine
Different citizens describe the same physical problem differently (e.g. *"Huge pothole near school gate"* vs. *"Damaged road beside entrance"*).
* **Semantic Vector Distance**: Generates 768-dimensional float embeddings using `text-embedding-004` and executes cosine distance queries (`pgvector`).
* **Geographic Proximity**: Calculates Haversine spatial distance within a 100m radius.
* **Combined Score**: $\text{Combined} = 0.65 \times S_{\text{semantic}} + 0.35 \times S_{\text{geo}}$.
* **Human-in-the-Loop Triage**: Candidates meeting thresholds ($\text{Semantic} \ge 0.75, \text{Combined} \ge 0.78$) are flagged as `PENDING` duplicate candidates in the Authority Dashboard. **Incidents are NEVER automatically merged or deleted**.

### B. Explainable 5-Factor Priority Engine
$$\text{Priority Score} = 0.30(\text{Safety Risk}) + 0.25(\text{Public Impact}) + 0.20(\text{Severity}) + 0.15(\text{Recurrence}) + 0.10(\text{Location Sensitivity})$$
* **Score Tiers**: Critical ($80\text{--}100$), High ($60\text{--}79$), Medium ($40\text{--}59$), Low ($0\text{--}39$).
* **Full Transparency**: Displays individual factor scores, weights, contributions, and human-readable text rationale.

### C. Municipal Authority Triage Dashboard (`/dashboard`)
* **Real-time Operational Feed**: Sorted by `priority_score DESC`.
* **Filtering & Search**: Search by Case ID, priority tier, lifecycle status, category, or department.
* **Incident Inspection (`/dashboard/incidents/[id]`)**: Overview, Leaflet map, citizen submissions, AI vision observations, 5-factor priority breakdown, duplicate review queue (**CONFIRM MERGE** / **REJECT DUPLICATE**), department reassignment, and status management.

### D. Citizen Verification & Tracking (`/track/[trackingCode]`)
* **Sanitized Tracking**: Public queries require possession of secret `tracking_code` UUIDs to access raw descriptions or verification actions, preventing incident enumeration via Case ID alone.
* **Verification Loop**: When status reaches `RESOLVED` or `CITIZEN_VERIFICATION`, citizens inspect officer repair photos and select:
  * **YES — ISSUE RESOLVED**: Marks status `VERIFIED` and closes work order.
  * **NO — STILL NOT RESOLVED**: Reopens status back to `IN_PROGRESS` and logs audit entry.

---

## 4. Technology Stack Specification

* **Frontend Framework**: Next.js 14+ (App Router, Server Components, TypeScript)
* **Styling & UI**: Tailwind CSS + Lucide Icons + Radix UI Primitives
* **Database & Vector Search**: PostgreSQL on Supabase + `pgvector` extension (768d vectors)
* **Storage**: Supabase Object Storage (`civicshield-media` bucket)
* **AI Multi-Modal Engine**: Google Gemini 2.5 Flash + text-embedding-004
* **Map Layer**: Leaflet.js + OpenStreetMap embed tile layer

---

## 5. Security & Data Integrity Rules

1. **Secret Isolation**: `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` remain server-side in API routes.
2. **Non-deletion Integrity**: Citizen reports are **never deleted** during merges or resolution rejections. Reports are re-linked to master incidents.
3. **Role Authorization**: Operations (`POST /api/incidents/merge`, `PATCH /api/incidents/[id]`) enforce authority role validation returning `403 Forbidden` for non-authority users.

---

## 6. System Limitations

* Live multi-modal AI classification and Supabase Cloud storage require production environment API keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Graceful server fallbacks handle offline development environments seamlessly.
