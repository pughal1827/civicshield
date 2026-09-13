# CivicShield AI — Final Hackathon Demo Checklist

This document provides a step-by-step walkthrough for presenting **CivicShield AI** to judges during the hackathon presentation.

---

## 1. Pre-Demo Setup & Environment Initialization

### A. Environment Configuration (`.env.local`)
Ensure `.env.local` contains valid API keys if performing live external cloud testing:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-google-gemini-api-key
```
*Note: If offline, CivicShield AI automatically uses graceful local fallback modes without crashing!*

### B. Database Seed Setup
Populate the database with synthetic demo data (Master Incident `CS-1042`, duplicate pairs, priority tiers, departments, and resolution evidence):
```bash
# Apply initial PostgreSQL schema
psql -f supabase/migrations/001_initial_schema.sql

# Seed demo dataset
psql -f supabase/seed.sql
```

### C. Launching the Local Server
```bash
npm run dev
# Open browser at http://localhost:3000
```

---

## 2. Step-by-Step Live Demo Presentation Script

### Step 1: Landing Page Overview (`http://localhost:3000`)
* **Key Talking Point**: *"Passive complaint portals flood municipal staff with duplicate, unorganized text. CivicShield AI transforms citizen reports into intelligent, prioritized, and trackable incidents."*
* **What to Show**: Hero section, 3 core platform strengths (AI Detection, Smart Prioritization, Transparent Resolution), and 6-step visual workflow.

### Step 2: Citizen Issue Submission (`http://localhost:3000/report`)
1. Click **"Report an Issue"**.
2. Enter synthetic complaint description:
   > *"Large open manhole beside a school entrance. Several citizens have reported that children could fall into it."*
3. Click **"Use My GPS Location"** or select location on map.
4. Click **"Submit Civic Issue Report"**.
5. **Show Judges**: Instant submission success screen displaying **Case ID (CS-XXXX)**, secret **Tracking Code UUID**, detected Category, and initial **Priority Tier**.

### Step 3: Municipal Authority Triage Dashboard (`http://localhost:3000/dashboard`)
1. Click **"Authority Portal"** in header.
2. **Show Judges**: Real-time status cards (Total Active, Critical, High, Pending, In Progress, Resolved).
3. Point out the newly submitted report at the top of the priority-ranked table sorted by `priority_score DESC`.
4. Demonstrate Search and Filters (Filter by **Critical (80+)** or Category **Drainage / Sewage**).

### Step 4: Incident Detail & 5-Factor Priority Breakdown (`http://localhost:3000/dashboard/incidents/[id]`)
1. Click **"Inspect"** on incident `CS-1042` or the new report.
2. **Show Judges**:
   - **OpenStreetMap Location View**: Renders precise GPS pin.
   - **AI Multi-modal Vision & Text Analysis**: Category, 1-line summary, severity, and key AI observations.
   - **Explainable 5-Factor Priority Breakdown**:
     - Safety Risk ($30\%$)
     - Public Impact ($25\%$)
     - Severity ($20\%$)
     - Recurrence ($15\%$)
     - Location Sensitivity ($10\%$)
     - *Show the exact formula and text reason for each factor!*

### Step 5: Duplicate Candidate Triage & Merge (`http://localhost:3000/dashboard/incidents/[id]`)
1. Scroll to the **Duplicate Candidate Review Queue** card.
2. Point out Candidate Incident `CS-1043` flagged with **89.5% similarity score** and **14.5m geographic distance**.
3. **Key Highlight**: *"CivicShield AI flags possible duplicates using vector embeddings and spatial distance, but requires explicit human authority approval before merging."*
4. Click **"Confirm Merge"**.
5. **Show Judges**: Candidate reports are re-linked under Master Incident `CS-1042`, report counter updates to **2 reports**, and candidate incident is marked resolved/merged.

### Step 6: Department Assignment & In-Progress Status Update
1. On the right panel, select **Department**: `Drainage & Sewerage`.
2. Change **Status**: `IN_PROGRESS`.
3. Click **"Save Operational Changes"**.
4. **Show Judges**: Audit Log History records the `DEPARTMENT_REASSIGNED` and `STATUS_CHANGED_TO_IN_PROGRESS` entries.

### Step 7: Public Citizen Tracking & Resolution Verification (`http://localhost:3000/track`)
1. Open `/track` and paste the secret **Tracking Code UUID**.
2. **Show Judges**:
   - Sanitized citizen status view.
   - Progress timeline showing active `IN_PROGRESS` step.
3. Switch status to `CITIZEN_VERIFICATION` in authority tab and refresh.
4. **Show Judges**: Field resolution proof image, officer repair notes, and interactive verification box:
   - *"Was this issue actually resolved?"*
5. Click **"YES — ISSUE RESOLVED"**.
6. **Show Judges**: Incident updates to **VERIFIED & CLOSED**, storing citizen confirmation.

---

## 3. Emergency Fallback Protocol (If API/Cloud Unavailable)

* **If Gemini API key is offline**: CivicShield AI automatically assigns the safe fallback payload (`PUBLIC_INFRA_DAMAGE`, confidence `0.30`, `isFallback: true`) and continues processing without throwing exceptions.
* **If Supabase Cloud Storage is offline**: The image upload API (`POST /api/upload`) falls back to CDN URLs gracefully.

---

## 4. Summary of Key Innovations to Highlight to Judges

1. **Dual-Signal Duplicate Engine**: Vectors + Spatial distance without auto-deleting records.
2. **Transparent 5-Factor Priority Score**: $30\% \text{ Safety} + 25\% \text{ Impact} + 20\% \text{ Severity} + 15\% \text{ Recurrence} + 10\% \text{ Location}$.
3. **Citizen Verification Step**: Closing the feedback loop by letting citizens confirm or reopen repairs.
