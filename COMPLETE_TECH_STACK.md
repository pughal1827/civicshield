# CivicShield AI — Complete Tech Stack

---

## 1. FRONTEND

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.3.4 | React framework — App Router, SSR, API routes |
| **React** | 19.2.8 | UI component library |
| **TypeScript** | 5 | Type safety across the entire codebase |
| **Tailwind CSS** | v4 | Utility-first CSS framework |
| **PostCSS** | with @tailwindcss/postcss | CSS processing pipeline |
| **Leaflet** | 1.9.4 | Interactive map rendering |
| **React-Leaflet** | 5.0.0 | React bindings for Leaflet maps |
| **Lucide React** | 1.43.0 | Icon library (map markers, UI icons) |
| **Zod** | 4.5.4 | Runtime type validation (shared with backend) |
| **clsx** | 2.1.1 | Conditional CSS class composition |
| **tailwind-merge** | 3.6.0 | Merges Tailwind classes without conflicts |

**Pages & Routes:**
- `/` — Landing page
- `/login`, `/signup` — Authentication
- `/report` — Citizen report submission
- `/track` — Report tracking
- `/dashboard` — Citizen dashboard
- `/my-reports` — User's report history
- `/how-it-works` — Platform explanation
- `/about` — About page
- `/authority/*` — Authority dashboard (intelligence, operations, evidence, workers)
- `/worker/*` — Worker task dashboard
- `/citizen/*` — Citizen-specific views

---

## 2. BACKEND

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 16.3.4 | Server-side API endpoints (App Router) |
| **Supabase** | 2.116.0 | Backend-as-a-Service (PostgreSQL + Auth + Storage + Realtime) |
| **@supabase/ssr** | 0.12.7 | Server-side Supabase client for Next.js |
| **@supabase/supabase-js** | 2.116.0 | Supabase JavaScript client |
| **Zod** | 4.5.4 | Request payload validation on every API route |
| **LiveKit** | Client 2.22.3 / Server SDK 2.19.0 | Real-time audio/video communication (citizen-officer) |

**API Route Structure (30+ endpoints):**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/logout` | POST | Session termination |
| `/api/auth/signup` | POST | Citizen registration |
| `/api/auth/me` | GET | Current user profile |
| `/api/ai/analyze` | POST | Multi-modal AI analysis |
| `/api/upload` | POST | Image/file upload to Supabase Storage |
| `/api/reports/track` | GET | Track report by case ID + secret UUID |
| `/api/incidents` | GET/POST | Incident CRUD |
| `/api/incidents/[id]` | GET/PATCH | Single incident operations |
| `/api/incidents/[id]/assign` | POST | Assign worker to incident |
| `/api/incidents/[id]/status` | PATCH | Update incident status |
| `/api/incidents/[id]/resolve` | POST | Submit resolution evidence |
| `/api/reports` | GET/POST | Report management |
| `/api/authority/evidence` | GET | Authority evidence review |
| `/api/authority/evidence/[id]/review` | POST | Evidence review submission |
| `/api/authority/intelligence/departments` | GET | Department analytics |
| `/api/authority/intelligence/escalations` | GET | Emergency escalation alerts |
| `/api/authority/intelligence/hotspots` | GET | Civic hotspot detection |
| `/api/authority/intelligence/recurring` | GET | Recurring problem detection |
| `/api/authority/intelligence/trends` | GET | Trend analysis |
| `/api/authority/intelligence/sla` | GET | SLA monitoring |
| `/api/authority/intelligence/root-causes` | GET | Root cause analysis |
| `/api/authority/intelligence/geographic` | GET | Geographic analytics |
| `/api/authority/operations` | GET | Operations dashboard |
| `/api/authority/workers` | GET | Worker management |
| `/api/priority` | GET | Priority scoring |
| `/api/health` | GET | Health check |
| `/api/v1/*` | Various | Versioned API endpoints |

---

## 3. AI & MACHINE LEARNING ENGINE

### 3.1 Core ML Models

| Model | Algorithm | Library | Input | Output | Purpose |
|-------|-----------|---------|-------|--------|---------|
| **YOLOv8n** | Single-Shot Object Detection | Ultralytics | Image (RGB) | Bounding boxes + class labels + confidence | Detect physical objects in uploaded images |
| **CLIP ViT-B/32** | Vision-Language Contrastive Learning | OpenAI CLIP (torch) | Image + Text | 512-dim embeddings each | Cross-modal semantic alignment (image vs. description) |
| **Random Forest** (Category) | Ensemble Decision Trees (100 trees) | scikit-learn | 10-dim feature vector | 12-class category prediction | Civic incident classification |
| **Random Forest** (Severity) | Ensemble Decision Trees (100 trees) | scikit-learn | 10-dim feature vector | 4-class severity prediction | Incident severity classification |
| **Isolation Forest** | Unsuperupervised Anomaly Detection (150 trees) | scikit-learn | 10-dim feature vector | Anomaly score + flags | Fraud, spam, and out-of-distribution detection |
| **Gemini** | Large Language Model (Multi-modal) | Google AI API | Text + Image | Structured JSON classification | Primary NLP categorization |
| **Gemini Embeddings** | Dense Vector Embedding | Google AI API | Normalized text | 3072-dim vector | Semantic similarity for duplicate detection |

### 3.2 AI Pipeline Architecture (4-Tier)

```
TIER 1 — YOLOv8 Object Detection
  • Confidence threshold: 0.35
  • IoU threshold (NMS): 0.45
  • Device: Auto-detect (CUDA / MPS / CPU)
  • COCO → Civic label mapping
  • Output: detections, top confidence, detection count

TIER 2 — CLIP Cross-Modal Verification
  • Model: ViT-B/32 (~350MB)
  • Image → ViT patch encoder → 512-dim embedding (L2-normalized)
  • Text → Tokenizer (77 token max) → Transformer encoder → 512-dim embedding (L2-normalized)
  • Similarity: cosine similarity (dot product of normalized vectors)
  • Thresholds: MATCHED ≥ 0.35, SUSPICIOUS ≥ 0.25, MISMATCHED < 0.25

TIER 3 — Random Forest Classification
  • Two independent classifiers (category + severity)
  • 10-dim feature vector:
    [0]  clip_similarity
    [1]  yolo_top_confidence
    [2]  yolo_detection_count (normalized)
    [3]  has_relevant_civic_object (binary)
    [4]  text_length (normalized)
    [5]  keyword_density
    [6]  sentiment_score
    [7]  aspect_ratio
    [8]  brightness
    [9]  edge_density
  • Category confirmation: RF matches claimed category OR CLIP is MATCHED

TIER 4 — Isolation Forest Anomaly Detection
  • 10-dim feature vector:
    [0]  brightness (norm)
    [1]  edge_density (Laplacian variance)
    [2]  extreme_aspect_ratio (screenshots, crops)
    [3]  text_length (norm)
    [4]  clip_similarity
    [5]  yolo_confidence
    [6]  yolo_count (norm)
    [7]  color_variance (stock photo vs real photo)
    [8]  bottom_region_interest (civic = ground-level)
    [9]  horizontal_line_score (screenshots)
  • Trained on 1500 normal + 500 anomalous synthetic samples
  • Rule-based flags supplement ML prediction

DECISION ENGINE
  REJECT          ← anomaly is confirmed fraud/spam
  FLAGGED_MISMATCH← image doesn't match text
  FLAGGED_ANOMALY ← statistical anomaly with flags
  PENDING_MODERATION ← suspicious content
  APPROVE_FOR_ROUTING ← all checks passed
```

### 3.3 NLP Classification Engine

**Primary: Google Gemini Multi-Modal**
- Model: `gemini-3.6-flash` (primary), with fallbacks: `gemini-flash-latest`, `gemini-2.5-flash-lite`, `gemini-3.5-flash`
- Temperature: 0.1 (deterministic output)
- Input: Text description + optional image (base64)
- Output: Structured JSON (category, severity, safety risk 0-100, department code, confidence, summary, important details)
- Timeout: 3.5 seconds per model attempt
- Cascading fallback across all 4 models before giving up

**Fallback: Smart NLP Rule-Based Categorizer**
- 12 category rules with regex patterns + keyword lists
- Scoring: regex match = +40 pts, keyword match = +25 pts
- Contextual severity elevation (urgency/de-escalation keywords)
- Public impact assessment based on safety risk thresholds
- Confidence: `min(0.98, max(0.78, 0.72 + score * 0.008))`
- Tertiary fallback: generic ROAD_POTHOLE / MEDIUM if no rules match

**12 Civic Categories:**
ROAD_POTHOLE, GARBAGE_OVERFLOW, BROKEN_STREETLIGHT, WATER_LEAKAGE, DRAINAGE_BLOCKAGE, TRAFFIC_SIGNAL_DAMAGED, PUBLIC_INFRA_DAMAGE, ELECTRICAL_HAZARD, OPEN_MANHOLE, SEWAGE_OVERFLOW, FLOOD, ILLEGAL_CONSTRUCTION

**4 Severity Levels:**
LOW, MEDIUM, HIGH, CRITICAL

**7 Department Codes:**
ROAD_MAINT, SANITATION, ELECTRICAL, WATER_DEPT, DRAINAGE, TRAFFIC, PUBLIC_WORKS

---

## 4. SPATIAL INTELLIGENCE & ANALYTICS

### 4.1 Core Spatial Algorithms

| Algorithm | Formula / Approach | Usage |
|-----------|-------------------|-------|
| **Haversine Distance** | `d = 2R × arcsin(√(sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)))` | All spatial proximity calculations |
| **Density-Based Clustering** | Custom DBSCAN-style: group incidents within configurable radius, merge overlapping clusters | Hotspot detection, recurrence analysis |
| **Centroid Calculation** | Arithmetic mean of lat/lng of cluster points | Hotspot center determination |
| **Max Radius from Center** | Haversine distance from centroid to farthest cluster member | Hotspot boundary sizing |
| **Token Overlap (Jaccard-like)** | Intersection over max of two word sets (>3 chars) | Text-based duplicate detection fallback |

### 4.2 Intelligence Engines

| Engine | Algorithm | Key Parameters | Output |
|--------|-----------|---------------|--------|
| **Duplicate Detection** | Weighted multi-modal scoring | Semantic (65%) + Geo (35%) + Category bonus | Candidate duplicate pairs with combined score |
| **Auto-Clustering** | Density-based spatial clustering + overlap merging | Radius: 250m, Min incidents: 3 | Master incident grouping |
| **Hotspot Detection** | Spatial density clustering + trend comparison | Radius: 500m, Min incidents: 3, Window: 7 days | Hotspot zones with severity, category breakdown, trend |
| **Recurrence Detection** | Spatial clustering within same category + temporal analysis | Radius: 250m, Min occurrences: 3, Lookback: 180 days | Recurring problem patterns with strength and interval |
| **SLA Monitoring** | Deterministic time arithmetic | CRITICAL: 4h, HIGH: 24h, MEDIUM: 72h, LOW: 168h | ON_TRACK / AT_RISK / BREACHED status per incident |
| **Escalation Engine** | Rule-based multi-factor escalation | Priority + Safety Risk + Report Count + SLA + Recurrence | NONE / WATCH / URGENT / EMERGENCY_REVIEW |
| **Trend Analysis** | Period-over-period percentage change | Current vs previous time window | Absolute change, percentage change, direction |
| **Priority Scoring** | Multi-factor weighted sum (0-100) | Safety Risk + Public Impact + Severity + Recurrence + Location Sensitivity | Prioritized incident queue |

---

## 5. DATABASE & STORAGE

### 5.1 Database

| Component | Details |
|-----------|---------|
| **Database** | Supabase (managed PostgreSQL) |
| **ORM/Query Builder** | Supabase JavaScript client (parameterized queries — no raw SQL) |
| **Schema** | 8 tables: users, departments, incidents, reports, embeddings, duplicate_relations, resolution_evidence, audit_logs |
| **Row Level Security (RLS)** | Enabled on all tables — role-based row access policies |
| **Dual Mode** | Mock store (in-memory, for demo) + Supabase (production) — toggled via `CIVICSHIELD_STORAGE_MODE` env var |

### 5.2 Database Tables

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| **users** | id, email, full_name, role, department_id | User accounts (citizen/worker/authority/admin) |
| **departments** | id, name, code, contact_email | Municipal departments |
| **incidents** | id, case_id, title, category, severity, priority_score, priority_factors, latitude, longitude, address, department_id, status, master_incident_id, report_count | Master incident records (clustered reports) |
| **reports** | id, incident_id, reporter_id, tracking_code, raw_description, image_url, latitude, longitude, is_original_report | Individual citizen submissions |
| **embeddings** | incident_id, embedding (3072-dim vector) | Gemini embeddings for semantic search |
| **duplicate_relations** | target_incident_id, candidate_incident_id, similarity_score, distance_meters, status | Duplicate detection results |
| **resolution_evidence** | id, incident_id, officer_id, proof_image_url, resolution_notes, citizen_verified | Resolution proof with citizen verification |
| **audit_logs** | id, incident_id, performed_by, action, old_value, new_value, reason | Complete audit trail |

### 5.3 File Storage

| Component | Details |
|-----------|---------|
| **Provider** | Supabase Storage |
| **Bucket** | `civicshield-media` |
| **Accepted Types** | JPEG, PNG, WebP |
| **Max Size** | 10MB per file |
| **Validation** | Server-side MIME type check + file extension verification |

---

## 6. SECURITY

### 6.1 Authentication & Session Security

| Mechanism | Implementation |
|-----------|--------------|
| **Password Hashing** | scrypt (N=16384, r=8, p=1, 64-byte key) via Node.js `crypto.scryptSync` |
| **Legacy Migration** | Transparent SHA-256 → scrypt upgrade on next login |
| **Session Tokens** | 256-bit cryptographically random (`crypto.randomBytes(32)`) |
| **Session Format** | `sess_<userId>_<64-hex-chars>` |
| **Session TTL** | 7 days |
| **Timing-Safe Comparison** | `crypto.timingSafeEqual` for password verification |
| **Rate Limiting** | 5 attempts per 60-second window per identifier (login/signup) |

### 6.2 Authorization

| Layer | Mechanism |
|-------|-----------|
| **Role-Based Access** | CITIZEN / WORKER / AUTHORITY / ADMIN — strictly server-enforced |
| **Role Escalation Prevention** | Registration hardcodes `role: 'CITIZEN'` — client parameters ignored |
| **Row Level Security** | Supabase RLS policies: citizens → own reports, workers → assigned tasks, authorities → department incidents |
| **Case ID Enumeration Protection** | Tracking requires secret UUID alongside case ID |
| **Service Role Isolation** | `SUPABASE_SERVICE_ROLE_KEY` is server-only (no `NEXT_PUBLIC_` prefix) |

### 6.3 Input Validation & Injection Prevention

| Layer | Mechanism |
|-------|-----------|
| **API Payload Validation** | Zod schemas on every API route (30+ schemas) |
| **SQL Injection Prevention** | Parameterized queries via Supabase client — no raw SQL concatenation |
| **Image Sanitization** | PIL converts all uploads to RGB, neutralizing EXIF-based exploits |
| **Error Handling** | Structured error responses — no stack traces or internal paths leaked to client |

### 6.4 AI Security

| Mechanism | Implementation |
|-----------|--------------|
| **Model Isolation** | All AI inference runs server-side — client never accesses model weights |
| **Timeout Enforcement** | 3.5s strict timeout per Gemini model attempt |
| **Quota DoS Protection** | Detects 429/quota exhaustion → instant fallback to local NLP |
| **Fallback Safety** | Conservative defaults (MEDIUM severity, generic routing) when AI fails |
| **Input Sanitization** | All images preprocessed to RGB; text truncated to safe lengths |

### 6.5 Tested Security Features

The Phase 4H Security Hardening Test Suite verifies:
1. Service role key isolation audit
2. AI integration & fallback payload integrity
3. Image upload validation (type + size)
4. Case ID enumeration protection
5. Row Level Security policy enforcement
6. Embedding failure safety (graceful degradation)

---

## 7. DEVTOOLS & INFRASTRUCTURE

| Technology | Purpose |
|------------|---------|
| **ESLint** | Code linting (eslint-config-next) |
| **TypeScript** | Compile-time type checking |
| **Node.js** | Runtime environment |
| **npm** | Package management |
| **Python** | AI engine runtime (separate from web app) |
| **pip** | Python package management |
| **Git** | Version control |

---

## 8. PYTHON AI ENGINE DEPENDENCIES

| Library | Purpose |
|---------|---------|
| **ultralytics** | YOLOv8 object detection |
| **torch** | PyTorch backend for CLIP |
| **clip** | OpenAI CLIP model (ViT-B/32) |
| **scikit-learn** | Random Forest + Isolation Forest classifiers |
| **numpy** | Numerical operations, feature vectors |
| **Pillow (PIL)** | Image preprocessing |
| **scipy** | Laplacian edge detection for image features |
| **pickle** | Model serialization/deserialization |
| **FastAPI / Flask** | (Referenced in app.py — AI serving layer) |

---

## 9. ENVIRONMENT & DEPLOYMENT

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API authentication |
| `GEMINI_MODEL` | Primary Gemini model name (default: gemini-3.6-flash) |
| `GEMINI_EMBEDDING_MODEL` | Embedding model name (default: gemini-embedding-001) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client-side) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-only) |
| `CIVICSHIELD_STORAGE_MODE` | `mock` or `supabase` — toggles data source |
| `LIVEKIT_API_KEY` | LiveKit real-time communication |
| `LIVEKIT_API_SECRET` | LiveKit secret |
| `NODE_ENV` | `development` or `production` |

---

## 10. COMPLETE DATA FLOW

```
Citizen (Mobile)
  │
  ├─ Uploads image + description + GPS
  │
  ▼
Next.js Frontend (React 19 + Tailwind)
  │
  ├─ Zod validates payload
  │
  ▼
Next.js API Route
  │
  ├─ Supabase Auth (role check)
  ├─ Image → Supabase Storage
  │
  ├─ AI Pipeline (Python engine):
  │   ├─ YOLOv8 → object detections
  │   ├─ CLIP → image-text similarity
  │   ├─ Random Forest → category + severity
  │   ├─ Isolation Forest → anomaly check
  │   └─ Decision: APPROVE / FLAGGED / REJECT
  │
  ├─ Gemini NLP → structured classification (primary)
  │   └─ Smart NLP fallback (if Gemini unavailable)
  │
  ├─ Gemini Embedding → 3072-dim vector → stored in DB
  │
  ├─ Duplicate Detector:
  │   ├─ Haversine distance (geo proximity)
  │   ├─ Cosine similarity (embeddings)
  │   └─ Weighted scoring → cluster or create new
  │
  ├─ Priority Engine → 0-100 score from 5 factors
  │
  ├─ Supabase PostgreSQL:
  │   ├─ incidents (master record)
  │   ├─ reports (individual submissions)
  │   ├─ embeddings (vector storage)
  │   └─ duplicate_relations (if matched)
  │
  ▼
Authority Dashboard (Leaflet maps + intelligence)
  │
  ├─ Hotspot Detection (density clustering)
  ├─ Recurrence Analysis (temporal + spatial)
  ├─ SLA Monitoring (time arithmetic)
  ├─ Escalation Engine (multi-factor rules)
  │
  ▼
Worker receives assignment → resolves → uploads evidence
  │
  ▼
Citizen verifies resolution → case CLOSED
```

---

## 11. MODEL INVENTORY SUMMARY

| Model | Type | Input Dim | Output | Training | Storage |
|-------|------|-----------|--------|----------|---------|
| YOLOv8n | Object Detection | Image (640×640) | Bounding boxes + classes | Pre-trained (COCO) | Downloaded at runtime (~6MB) |
| CLIP ViT-B/32 | Contrastive Embedding | Image + Text → 512-dim each | Cosine similarity | Pre-trained (OpenAI) | Downloaded at runtime (~350MB) |
| RF Category | Random Forest Classifier | 10-dim vector | 12-class probability | Synthetic (2000 samples) | Pickle file on disk |
| RF Severity | Random Forest Classifier | 10-dim vector | 4-class probability | Synthetic (2000 samples) | Pickle file on disk |
| Isolation Forest | Anomaly Detector | 10-dim vector | Binary anomaly + score | Synthetic (2000 samples) | Pickle file on disk |
| Gemini | LLM (Multi-modal) | Text + Image (base64) | Structured JSON | Pre-trained (Google) | API (no local storage) |
| Gemini Embedding | Dense Embedding | Text (≤1000 chars) | 3072-dim vector | Pre-trained (Google) | API (stored in Supabase) |
