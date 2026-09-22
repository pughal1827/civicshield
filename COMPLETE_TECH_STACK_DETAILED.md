# CivicShield AI — Complete Technical Stack

---

## Table of Contents
1. Frontend Stack
2. Backend Stack
3. AI / Machine Learning Stack
4. Algorithms & Models (Detailed)
5. Database & Storage Stack
6. Security Stack
7. Maps & Geo Stack
8. Validation Stack
9. DevOps & Infrastructure
10. Complete System Architecture
11. Data Flow Pipeline
12. File & Code Structure

---

## 1. FRONTEND STACK

### Core Framework & Language

| Technology | Version | Role |
|------------|---------|------|
| **Next.js** | 16.3.4 | Full-stack React framework — App Router, SSR, API routes, file-system routing |
| **React** | 19.2.8 | UI component library — latest stable release |
| **TypeScript** | 5 | Static type checking across entire codebase — interfaces, generics, strict null checks |
| **Node.js** | (LTS) | Server-side runtime for Next.js |

### Styling

| Technology | Version | Role |
|------------|---------|------|
| **Tailwind CSS** | v4 | Utility-first CSS framework — v4 uses native CSS-first config (no JS config file) |
| **PostCSS** | with @tailwindcss/postcss v4 | CSS processing pipeline — transforms Tailwind directives |
| **clsx** | 2.1.1 | Conditional CSS class composition (`clsx('base', condition && 'extra')`) |
| **tailwind-merge** | 3.6.0 | Merges Tailwind classes without conflicts — resolves class priority intelligently |

### Mapping & Geo

| Technology | Version | Role |
|------------|---------|------|
| **Leaflet** | 1.9.4 | Open-source interactive map library — renders map tiles, markers, popups, polygons |
| **React-Leaflet** | 5.0.0 | React wrapper components for Leaflet — `<MapContainer>`, `<TileLayer>`, `<Marker>`, `<Popup>` |
| **Lucide React** | 1.43.0 | Icon library — 1000+ consistent SVG icons used for map markers, buttons, navigation, status indicators |

### Communication

| Technology | Version | Role |
|------------|---------|------|
| **LiveKit Client** | 2.22.3 | Real-time audio/video calling SDK — citizen-officer video conferencing |
| **LiveKit Server SDK** | 2.19.0 | Server-side token generation and room management for LiveKit |

### Validation (Shared Frontend)

| Technology | Version | Role |
|------------|---------|------|
| **Zod** | 4.5.4 | Runtime type validation — schemas shared between frontend forms and backend API routes |

---

## 2. BACKEND STACK

### Core Backend

| Technology | Version | Role |
|------------|---------|------|
| **Next.js API Routes** | 16.3.4 | Server-side API endpoints using App Router (`app/api/`) — 30+ route handlers |
| **Next.js Server Components** | 16.3.4 | Server-rendered React components for authority dashboards and data-heavy pages |
| **Next.js Server Actions** | 16.3.4 | Form mutations directly from React components without manual API route wiring |

### Backend-as-a-Service

| Technology | Version | Role |
|------------|---------|------|
| **Supabase** | 2.116.0 | Complete backend platform: PostgreSQL database, authentication, file storage, realtime subscriptions, edge functions |
| **@supabase/ssr** | 0.12.7 | Server-side Supabase client optimized for Next.js App Router — handles cookies, sessions, SSR auth |
| **@supabase/supabase-js** | 2.116.0 | Core Supabase JavaScript client — used in both server components and client components |

### Validation (Backend)

| Technology | Version | Role |
|------------|---------|------|
| **Zod** | 4.5.4 | Every API route validates request payloads before processing — `safeParse()` used for non-throwing validation |

---

## 3. AI / MACHINE LEARNING STACK

### AI Engine Runtime

| Technology | Version | Role |
|------------|---------|------|
| **Python** | 3.10+ | AI engine runtime language |
| **FastAPI** | (referenced in app.py) | Python web framework — serves AI inference as REST API microservice |
| **uvicorn** | (standard) | ASGI server for FastAPI |
| **Flask** | (alternative in app.py) | Fallback web framework option |

### Deep Learning Framework

| Technology | Version | Role |
|------------|---------|------|
| **PyTorch** | (via torch) | Deep learning backend — powers CLIP inference and tensor operations |
| **Ultralytics** | (YOLOv8) | Object detection framework — YOLOv8 model loading, inference, NMS |

### Classical ML

| Technology | Version | Role |
|------------|---------|------|
| **scikit-learn** | (sklearn) | Classical ML library — Random Forest and Isolation Forest classifiers |
| **NumPy** | (latest) | Numerical computing — feature vector construction, array operations, mathematical functions |
| **SciPy** | (latest) | Scientific computing — Laplacian edge detection for image feature extraction |

### Image Processing

| Technology | Version | Role |
|------------|---------|------|
| **Pillow (PIL)** | (latest) | Image preprocessing — format conversion (RGB), resizing, normalization, EXIF stripping |

### LLM / Embedding APIs

| Technology | Version | Role |
|------------|---------|------|
| **Google Gemini API** | (@google/genai 2.21.0) | Primary LLM — multi-modal classification (text + image → structured JSON) |
| **Gemini Embedding API** | (gemini-embedding-001) | Text embedding service — 3072-dim vector generation for semantic search |
| **OpenAI CLIP** | (clip package) | Vision-language model — 512-dim cross-modal embeddings for image-text verification |

### Model Serialization

| Technology | Version | Role |
|------------|---------|------|
| **pickle** | (Python stdlib) | Serialize/deserialize trained RF and IF models to/from disk (.pkl files) |

---

## 4. ALGORITHMS & MODELS — DETAILED

### 4.1 Computer Vision Models

#### YOLOv8n (You Only Look Once, version 8, nano)

| Property | Value |
|----------|-------|
| **Model Size** | ~6MB (yolov8n.pt) |
| **Architecture** | Single-shot detector — divides image into grid, predicts bounding boxes + class probabilities in one forward pass |
| **Backbone** | CSPDarknet (modified) |
| **Input Size** | 640 × 640 pixels (auto-resized) |
| **Classes** | 80 COCO classes (mapped to civic hazard labels) |
| **NMS** | Non-Maximum Suppression with configurable IoU threshold (default 0.45) |
| **Confidence Threshold** | 0.35 (configurable) |
| **Device Support** | Auto-detect: CUDA (NVIDIA GPU) → MPS (Apple Silicon) → CPU fallback |
| **Civic Label Mapping** | COCO class IDs → civic labels (e.g., car/bus/truck → "vehicle", person → "person") |
| **Relevant Civic Labels** | pothole, garbage, street_light, water_leak, crack, fire, manhole, vehicle, crowd, debris, trash, flood, leak, broken, damage |
| **Output** | Bounding boxes (x1, y1, x2, y2), confidence scores, class IDs, class labels |
| **Fallback** | Graceful degradation — returns empty results if model unavailable |

#### CLIP ViT-B/32 (Contrastive Language-Image Pre-training)

| Property | Value |
|----------|-------|
| **Model** | ViT-B/32 (Vision Transformer, Base size, 32×32 patches) |
| **Model Size** | ~350MB |
| **Architecture** | Dual encoder: Vision Transformer (image) + Text Transformer (text), trained with contrastive loss on 400M image-text pairs |
| **Image Encoder** | Vision Transformer — image split into 32×32 patches, positional embeddings, 12 Transformer layers |
| **Text Encoder** | Transformer — tokenized text (max 77 tokens), 12 Transformer layers |
| **Output Dimensions** | 512-dim embedding for both image and text |
| **Normalization** | L2 normalization — cosine similarity reduces to dot product |
| **Similarity Thresholds** | MATCHED ≥ 0.35, SUSPICIOUS ≥ 0.25, MISMATCHED < 0.25 |
| **Device Support** | Same as YOLO (CUDA → MPS → CPU) |
| **Fallback** | Returns neutral "REVIEW" status if model unavailable |

### 4.2 Classical ML Models

#### Random Forest — Category Classifier

| Property | Value |
|----------|-------|
| **Algorithm** | `RandomForestClassifier` from scikit-learn |
| **Trees** | 100 estimators |
| **Max Depth** | 12 |
| **Min Samples Split** | 5 |
| **Min Samples Leaf** | 2 |
| **Random State** | 42 (reproducibility) |
| **Output** | 12-class probability distribution (ROAD_POTHOLE, GARBAGE_OVERFLOW, BROKEN_STREETLIGHT, WATER_LEAKAGE, DRAINAGE_BLOCKAGE, TRAFFIC_SIGNAL_DAMAGED, PUBLIC_INFRA_DAMAGE, ELECTRICAL_HAZARD, OPEN_MANHOLE, SEWAGE_OVERFLOW, FLOOD, ILLEGAL_CONSTRUCTION) |
| **Feature Vector** | 10 dimensions (see below) |
| **Training Data** | 2000 synthetic samples (production: replace with real labeled data) |
| **Model Storage** | `rf_category_model.pkl` on disk |

#### Random Forest — Severity Classifier

| Property | Value |
|----------|-------|
| **Algorithm** | `RandomForestClassifier` from scikit-learn |
| **Trees** | 100 estimators |
| **Max Depth** | 10 |
| **Min Samples Split** | 5 |
| **Min Samples Leaf** | 2 |
| **Random State** | 42 |
| **Output** | 4-class probability distribution (LOW, MEDIUM, HIGH, CRITICAL) |
| **Feature Vector** | Same 10-dim vector as category classifier |
| **Training Data** | 2000 synthetic samples |
| **Model Storage** | `rf_severity_model.pkl` on disk |

#### 10-Dimensional Feature Vector (for both RF models)

| Index | Feature | Source | Extraction Method |
|-------|---------|--------|-------------------|
| 0 | CLIP similarity score | TIER 2 (CLIP) | Cosine similarity of 512-dim embeddings |
| 1 | YOLO top confidence | TIER 1 (YOLO) | Highest confidence among all detections |
| 2 | YOLO detection count (normalized) | TIER 1 (YOLO) | `min(count / 10, 1.0)` |
| 3 | Has relevant civic object (binary) | TIER 1 (YOLO) | 1.0 if any detected label matches civic hazard list |
| 4 | Text length (normalized) | Text analysis | `min(word_count / 200, 1.0)` |
| 5 | Civic keyword density | Text analysis | Matches / total words against 36 civic keywords |
| 6 | Sentiment score | Text analysis | `(positive_words - negative_words) / total` — range [-1, +1] |
| 7 | Image aspect ratio | Image stats | `width / height` |
| 8 | Image brightness | Image stats | Mean of grayscale values / 255 |
| 9 | Image edge density | Image stats | `(horizontal_gradient + vertical_gradient) / 2 / 255` |

#### Isolation Forest — Anomaly Detector

| Property | Value |
|----------|-------|
| **Algorithm** | `IsolationForest` from scikit-learn |
| **Trees** | 150 estimators |
| **Max Samples** | "auto" (256 per tree) |
| **Contamination** | 0.20 (assumes 20% of training data is anomalous) |
| **Random State** | 42 |
| **Training** | Unsupervised — trained only on normal samples (y=0) |
| **Output** | Binary prediction (-1 = anomaly, 1 = normal) + decision score |
| **Feature Vector** | 10 dimensions (different from RF) |
| **Training Data** | 1500 normal + 500 anomalous synthetic samples |
| **Model Storage** | `isolation_forest_model.pkl` + `if_scaler.pkl` on disk |

#### 10-Dimensional Anomaly Feature Vector (for Isolation Forest)

| Index | Feature | Purpose | Detection Target |
|-------|---------|---------|-----------------|
| 0 | Brightness (normalized) | Mean grayscale / 255 | Blank/dark images, overexposed images |
| 1 | Edge density (Laplacian variance/10000) | Image sharpness via Laplacian operator | Blank/white images (zero edges) |
| 2 | Extreme aspect ratio (binary) | Width/height > 3.0 or height/width > 3.0 | Screenshots, cropped images, cropped screenshots |
| 3 | Text length (normalized) | `min(word_count / 50, 1.0)` | Empty/missing descriptions |
| 4 | CLIP similarity | From TIER 2 | Image-text mismatch |
| 5 | YOLO confidence | From TIER 1 | No recognizable objects detected |
| 6 | YOLO count (normalized) | `min(count / 10, 1.0)` | Too many objects (busy scene, not a civic issue) |
| 7 | Color variance (std/100) | Standard deviation of RGB values | Stock photos (high variance) vs real photos |
| 8 | Bottom region interest | Edge density in bottom half / total edge density | Civic issues are ground-level (bottom of image) |
| 9 | Horizontal line score | Count of strong horizontal gradients / height | Screenshots (many horizontal lines) |

#### Synthetic Training Data Generation

**Normal Civic Images (1500 samples):**
- Brightness: 0.15 – 0.75 (well-lit outdoor photos)
- Edge density: 0.05 – 0.60 (real photos have natural edges)
- Aspect ratio: 0.0 (normal proportions)
- Text length: 0.3 – 1.0 (citizens write descriptions)
- CLIP similarity: 0.25 – 0.90 (image matches text)
- YOLO confidence: 0.3 – 0.95 (objects detected)
- Color variance: 0.05 – 0.50 (real photos)
- Bottom interest: 0.4 – 0.9 (civic issues are ground-level)
- Horizontal lines: 0.0 – 0.15 (minimal — real photos)

**Anomalous Samples (500 samples, 5 types):**
- Type 1 — Blank/Dark: brightness ~0, edge density ~0, no text
- Type 2 — Screenshot: brightness 0.5-0.9, edge density ~0.01, horizontal lines 0.4-0.9
- Type 3 — Stock Photo: low CLIP similarity, no YOLO detections, high color variance
- Type 4 — Overexposed: brightness >0.9, edge density ~0
- Type 5 — Meme/Manipulated: high color variance, low CLIP similarity, many horizontal lines

### 4.3 LLM Classification

#### Gemini Multi-Modal NLP (Primary Classifier)

| Property | Value |
|----------|-------|
| **Primary Model** | `gemini-3.6-flash` |
| **Fallback Models** | `gemini-flash-latest`, `gemini-2.5-flash-lite`, `gemini-3.5-flash` |
| **Input** | Text description + optional image (base64 encoded, max ~4MB) |
| **Output** | Structured JSON conforming to Zod schema |
| **Temperature** | 0.1 (near-deterministic for consistent classification) |
| **Timeout** | 3.5 seconds per model attempt |
| **System Prompt** | Detailed civic classification rules: 12 categories, 4 severity levels, 7 departments, safety risk scoring (0-100) |
| **Response Format** | `responseMimeType: 'application/json'` — forces JSON-only output |
| **Error Handling** | Cascading fallback: tries each model in sequence, falls back to Smart NLP if all fail |

#### Smart NLP Rule-Based Categorizer (Fallback)

| Property | Value |
|----------|-------|
| **Architecture** | Pure TypeScript — zero external dependencies |
| **Rules** | 12 category rules, each containing: |
| | • 15-25 domain-specific keywords |
| | • 4-7 regex patterns for contextual phrase matching |
| | • Default severity and base safety risk score |
| | • Reasoning template for explainability |
| **Scoring** | Regex match = +40 points, keyword match = +25 points |
| **Contextual Elevation** | Urgency words (danger, emergency, fatal, school) → severity +1 level, risk +12 |
| **Contextual De-escalation** | Minimizing words (minor, small, cosmetic) → severity -1 level, risk -15 |
| **Confidence** | `min(0.98, max(0.78, 0.72 + score × 0.008))` |
| **Fallback** | Generic ROAD_POTHOLE / MEDIUM if no rules match |

#### Gemini Embeddings

| Property | Value |
|----------|-------|
| **Model** | `gemini-embedding-001` |
| **Output Dimensions** | 3072 |
| **Input** | Normalized text: `Category: X | Complaint: Y | Summary: Z` (max 1000 chars) |
| **Purpose** | Semantic vector for duplicate detection and similarity search |
| **Storage** | Supabase `embeddings` table — pgvector extension with IVFFLAT index |

---

## 5. DATABASE & STORAGE STACK

### Database

| Technology | Version | Role |
|------------|---------|------|
| **PostgreSQL** | (via Supabase managed) | Primary relational database — all structured data |
| **Supabase** | 2.116.0 | Backend platform wrapping PostgreSQL with auth, storage, realtime |
| **pgvector** | (Supabase extension) | Vector similarity search — stores 768-dim embeddings with cosine distance index |
| **uuid-ossp** | (PostgreSQL extension) | UUID generation for all primary keys |
| **PostGIS** | (future upgrade) | Geospatial queries — planned migration from custom Haversine to PostGIS at scale |

### Schema — 8 Core Tables

| Table | Primary Key | Key Fields | Purpose |
|-------|------------|-----------|---------|
| **departments** | UUID | id, name, code, contact_email | Municipal departments (7 codes) |
| **users** | UUID | id, email, full_name, role, department_id | User accounts — CITIZEN, WORKER, AUTHORITY, ADMIN |
| **incidents** | UUID | case_id (unique string), title, category, severity, priority_score, priority_factors (JSONB), latitude, longitude, address, department_id, status, master_incident_id, report_count | Master incident records — clustered reports |
| **reports** | UUID | incident_id (FK), reporter_id (FK), tracking_code (UUID), raw_description, image_url, audio_url, latitude, longitude, is_original_report | Individual citizen submissions linked to master incidents |
| **ai_analyses** | UUID | incident_id (FK), raw_ai_response (JSONB), confidence_score, detected_category, detected_severity, suggested_department_code, extracted_features (JSONB) | AI analysis results per incident |
| **embeddings** | UUID | incident_id (FK), embedding (vector(768)), created_at | Gemini embedding vectors for semantic search |
| **duplicate_relations** | UUID | target_incident_id (FK), candidate_incident_id (FK), similarity_score, distance_meters, status (PENDING/CONFIRMED/REJECTED) | Duplicate detection queue for human review |
| **resolution_evidence** | UUID | incident_id (FK), officer_id (FK), proof_image_url, resolution_notes, citizen_verified, citizen_feedback | Resolution proof with citizen verification |
| **audit_logs** | UUID | incident_id (FK), performed_by (FK), action, old_value (JSONB), new_value (JSONB), reason | Complete immutable audit trail |

### Database Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| idx_incidents_status | incidents | status | Fast filtering by incident status |
| idx_incidents_priority | incidents | priority_score DESC | Priority-sorted queries |
| idx_incidents_category | incidents | category | Category filtering |
| idx_incidents_department | incidents | department_id | Department-scoped queries |
| idx_incidents_assigned_officer | incidents | assigned_officer_id | Worker's task queries |
| idx_incidents_created_at | incidents | created_at DESC | Time-based queries |
| idx_incidents_location | incidents | latitude, longitude | Geospatial proximity queries |
| idx_reports_incident | reports | incident_id | Lookup all reports for an incident |
| idx_reports_tracking_code | reports | tracking_code | Citizen tracking lookup |
| idx_duplicate_relations_pending | duplicate_relations | status (partial, WHERE status='PENDING') | Pending duplicate triage queue |
| idx_embeddings_vector | embeddings | embedding (IVFFLAT, cosine_ops, lists=100) | Vector similarity search |

### File Storage

| Component | Configuration |
|-----------|--------------|
| **Provider** | Supabase Storage |
| **Bucket** | `civicshield-media` |
| **Accepted Types** | JPEG, PNG, WebP (server-side MIME validation) |
| **Max File Size** | 10MB per file |
| **Access Control** | Authenticated uploads only; public read for resolved incident images |
| **Path Structure** | `/reports/{incident_id}/{report_id}.jpg` |

### Data Modes

| Mode | Storage | Use Case |
|------|---------|----------|
| **Mock** | In-memory JavaScript Map + JSON seed file | Development, demo, offline testing |
| **Supabase** | Managed PostgreSQL + Storage | Production deployment |
| **Toggle** | `CIVICSHIELD_STORAGE_MODE` env var (`mock` or `supabase`) | Seamless switching |

---

## 6. SECURITY STACK

### Authentication

| Mechanism | Implementation | Details |
|-----------|---------------|---------|
| **Password Hashing** | `crypto.scryptSync()` | N=16384, r=8, p=1, 64-byte key. Format: `scrypt$<salt_hex>$<hash_hex>` |
| **Legacy Migration** | Transparent SHA-256 → scrypt | Auto-upgrade on next successful login |
| **Timing-Safe Comparison** | `crypto.timingSafeEqual()` | Prevents timing side-channel attacks |
| **Session Tokens** | `crypto.randomBytes(32)` | 256-bit CSPRNG tokens. Format: `sess_<userId>_<64hex>` |
| **Session TTL** | 7 days | Auto-expiry enforced on every access |
| **Rate Limiting** | In-memory Map | 5 attempts per 60-second window per identifier |

### Authorization

| Mechanism | Implementation | Details |
|-----------|---------------|---------|
| **RBAC** | Server-side role enforcement | CITIZEN / WORKER / AUTHORITY / ADMIN |
| **Role Escalation Prevention** | Hardcoded role on registration | `role: 'CITIZEN'` — client input ignored |
| **Row Level Security** | PostgreSQL RLS via Supabase | Row-level policies on all 8 tables |
| **Case ID Enumeration Protection** | Dual-factor tracking | UUID secret required alongside case ID |

### API Security

| Mechanism | Implementation |
|-----------|---------------|
| **Input Validation** | Zod schemas on every API route (30+ schemas) |
| **SQL Injection Prevention** | Parameterized queries via Supabase client |
| **CORS** | Next.js API route headers + Supabase CORS |
| **Error Handling** | Structured error responses — no stack traces leaked |
| **File Upload Validation** | MIME type check + size limit (10MB) |

### AI Security

| Mechanism | Implementation |
|-----------|---------------|
| **Model Isolation** | Server-side only — client never accesses model internals |
| **Prompt Injection Defense** | JSON-only output mode + Zod validation |
| **DoS Protection** | 3.5s per-model timeout + quota exhaustion detection + fallback |
| **Input Sanitization** | PIL RGB conversion strips EXIF; text length limits |

---

## 7. MAPS & GEO STACK

| Component | Technology | Details |
|-----------|-----------|---------|
| **Map Rendering** | Leaflet 1.9.4 | Open-source, tile-based interactive maps |
| **React Bindings** | React-Leaflet 5.0.0 | Declarative map components in React |
| **Tile Provider** | OpenStreetMap (default) | Free, open tile data — configurable to Google Maps, Mapbox |
| **Geo Calculations** | Custom TypeScript | Haversine distance, centroid, max-radius-from-center |
| **Coordinate Validation** | Custom bounds checking | Latitude [-90, 90], Longitude [-180, 180] |
| **WKT Support** | PostGIS POINT format | `POINT(<lng> <lat>)` for database spatial queries |

---

## 8. VALIDATION STACK

| Layer | Technology | Scope |
|-------|-----------|-------|
| **API Payload Validation** | Zod 4.5.4 | Every API route — request body, query params, route params |
| **AI Output Validation** | Zod 4.5.4 | Gemini responses parsed against schema |
| **Coordinate Validation** | Custom TypeScript | Range checks on lat/lng before database insert |
| **File Upload Validation** | Manual checks | Content-type whitelist + size limit |
| **TypeScript Compile-Time** | TypeScript 5 | Strict mode — null checks, type narrowing, exhaustive switches |
| **ESLint** | 9 + eslint-config-next | Code quality, unused vars, React best practices |

---

## 9. DEVOPS & INFRASTRUCTURE

| Component | Technology | Details |
|-----------|-----------|---------|
| **Frontend Hosting** | Vercel (recommended) | Edge deployment, automatic previews, image optimization |
| **Backend Hosting** | Vercel (API routes) or separate FastAPI server | Serverless functions or dedicated Python service |
| **Database** | Supabase Cloud | Managed PostgreSQL with automatic backups, connection pooling |
| **File Storage** | Supabase Storage | S3-compatible object storage |
| **AI Microservice** | FastAPI + uvicorn | Separate Python service for YOLO/CLIP inference |
| **Version Control** | Git | Standard version control |
| **Package Manager (JS)** | npm | Node.js dependency management |
| **Package Manager (Python)** | pip | Python dependency management |
| **Linting** | ESLint 9 | JavaScript/TypeScript code quality |
| **Type Checking** | TypeScript 5 | Compile-time type safety |
| **Environment Config** | .env files | Separate configs for development and production |

---

## 10. COMPLETE SYSTEM ARCHITECTURE

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           CITIZEN (Mobile Browser)                          ║
║  Next.js PWA — Image upload, description, GPS, real-time status             ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                    NEXT.JS 16 FRONTEND (React 19 + TypeScript)              ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  ║
║  │   Citizen     │  │   Worker      │  │  Authority    │  │  Admin         │  ║
║  │   Portal      │  │   Dashboard   │  │  Intelligence │  │  Panel         │  ║
║  └──────────────┘  └──────────────┘  └──────────────┘  └────────────────┘  ║
║  ┌──────────────┐  ┌──────────────┐                                      ║
║  │  Leaflet      │  │  LiveKit      │                                      ║
║  │  Maps         │  │  Video Call   │                                      ║
║  └──────────────┘  └──────────────┘                                      ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  Zod Validation (client-side pre-check before every API call)        │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                    │
                    HTTP/REST API Calls (JSON)
                                    ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║              NEXT.JS API ROUTES (Server-Side, TypeScript)                   ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  Authentication Middleware:                                          │  ║
║  │  • Verify session token                                              │  ║
║  │  • Check token expiry                                                │  ║
║  │  • Verify user role                                                  │  ║
║  │  • Enforce resource-level permissions                                │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║  ┌──────────────────────────────────────────────────────────────────────┐  ║
║  │  Zod Validation (server-side — second layer)                         │  ║
║  └──────────────────────────────────────────────────────────────────────┘  ║
║                                                                              ║
║  Route Handlers (30+ endpoints):                                            ║
║  POST /api/auth/login          GET  /api/authority/intelligence/hotspots   ║
║  POST /api/auth/signup         GET  /api/authority/intelligence/recurring  ║
║  POST /api/auth/logout         GET  /api/authority/intelligence/sla        ║
║  GET  /api/auth/me             GET  /api/authority/intelligence/escalations ║
║  POST /api/ai/analyze          GET  /api/authority/intelligence/trends     ║
║  POST /api/upload              GET  /api/authority/intelligence/root-causes ║
║  GET  /api/reports/track       GET  /api/authority/operations              ║
║  POST /api/incidents           GET  /api/authority/evidence                ║
║  POST /api/incidents/[id]      POST /api/authority/evidence/[id]/review   ║
║  POST /api/incidents/[id]/assign    GET  /api/priority                       ║
║  PATCH /api/incidents/[id]/status  GET  /api/health                         ║
║  POST /api/incidents/[id]/resolve                                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
╔═══════════════════╗  ╔═══════════════════╗  ╔═══════════════════╗
║   AI MICROSERVICE ║  ║     SUPABASE      ║  ║    SUPABASE       ║
║   (FastAPI/Python)║  ║   PostgreSQL      ║  ║    Storage        ║
║                   ║  ║                   ║  ║                   ║
║  4-Tier Pipeline: ║  ║  8 Tables:        ║  ║  Bucket:          ║
║  ┌─────────────┐ ║  ║  • users          ║  ║  civicshield-media ║
║  │  TIER 1     │ ║  ║  • departments   ║  ║                   ║
║  │  YOLOv8n    │ ║  ║  • incidents     ║  ║  Stores:          ║
║  │  Object Det.│ ║  ║  • reports       ║  ║  • Report images  ║
║  ├─────────────┤ ║  ║  • ai_analyses   ║  ║  • Evidence imgs  ║
║  │  TIER 2     │ ║  ║  • embeddings    ║  ║  • Officer proof  ║
║  │  CLIP       │ ║  ║  • dup_relations ║  ║                   ║
║  │  Cross-Modal│ ║  ║  • resolution_   ║  ║  Validation:      ║
║  │  Verific.   │ ║  ║  │    evidence   ║  ║  • MIME type check ║
║  ├─────────────┤ ║  ║  • audit_logs    ║  ║  • 10MB max size  ║
║  │  TIER 3     │ ║  ║                   ║  ║                   ║
║  │  RF × 2     │ ║  ║  Extensions:      ║  ╚═══════════════════╝
║  │  Category +  │ ║  ║  • uuid-ossp      ║
║  │  Severity    │ ║  ║  • pgvector       ║
║  ├─────────────┤ ║  ║  • PostGIS (future)║
║  │  TIER 4     │ ║  ║                   ║
║  │  Isolation   │ ║  ║  RLS on all tables ║
║  │  Forest      │ ║  ║  13 Indexes       ║
║  │  Anomaly Det.│ ║  ║                   ║
║  └─────────────┘ ║  ╚═══════════════════╝
║                   ║
║  NLP (Server-Side):║
║  ┌─────────────┐ ║
║  │  Gemini LLM │ ║                    ┌──────────────────────────┐
║  │  (Primary)  │ ║                    │  SUPABASE AUTH            │
║  ├─────────────┤ ║                    │  • Email/password auth    │
║  │  Smart NLP  │ ║                    │  • Session management     │
║  │  (Fallback) │ ║                    │  • Role enforcement       │
║  └─────────────┘ ║                    │  • OAuth providers (future)│
║                   ║                    └──────────────────────────┘
╚═══════════════════╝
```

---

## 11. DATA FLOW — END TO END

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CITIZEN ACTION                                      │
│  1. Opens app → sees map with existing incidents                            │
│  2. Taps "Report Issue" → camera opens                                      │
│  3. Takes photo → enters description → GPS auto-captured                    │
│  4. Taps "Submit"                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND: ZOD VALIDATION (Client-Side)                    │
│  • Description: non-empty, max 5000 chars                                   │
│  • Image: JPEG/PNG/WebP, max 10MB                                          │
│  • GPS: valid lat/lng bounds                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              API ROUTE: /api/reports (POST) — Zod validates again            │
│                                                                              │
│  Step 1: Authenticate user → get session                                    │
│  Step 2: Upload image → Supabase Storage (civicshield-media bucket)         │
│  Step 3: Invoke Smart NLP → instant category + severity classification     │
│  Step 4: Invoke AI microservice:                                            │
│          POST /api/v1/verify-incident-image                                 │
│          { image_bytes, description, claimed_category, lat, lng }           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AI MICROSERVICE: 4-TIER PIPELINE                          │
│                                                                              │
│  TIER 1 — YOLOv8: Detect objects in image                                  │
│    → vehicles, people, debris → civic hazard labels → confidence scores    │
│                                                                              │
│  TIER 2 — CLIP: Cross-modal verification                                    │
│    → Image embedding (512-dim) + Text embedding (512-dim)                   │
│    → Cosine similarity → MATCHED / SUSPICIOUS / MISMATCHED                 │
│                                                                              │
│  TIER 3 — Random Forest: Build 10-dim feature vector                       │
│    → Category prediction (12 classes) + Severity prediction (4 classes)    │
│    → Confidence scores for both                                             │
│                                                                              │
│  TIER 4 — Isolation Forest: Anomaly detection                               │
│    → 10-dim anomaly features → is_anomaly + anomaly_score + flags          │
│                                                                              │
│  DECISION ENGINE:                                                           │
│    REJECT ← fraud/spam confirmed                                            │
│    FLAGGED_MISMATCH ← image doesn't match text                              │
│    FLAGGED_ANOMALY ← statistical anomaly                                    │
│    PENDING_MODERATION ← suspicious content                                  │
│    APPROVE_FOR_ROUTING ← all checks passed                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NLP CLASSIFICATION (Parallel / Sequential)                │
│                                                                              │
│  A) GEMINI (Primary):                                                       │
│     • Multi-modal input: image (base64) + text description                  │
│     • System prompt: 12 categories, 4 severities, 7 departments,           │
│       safety risk 0-100, confidence 0-1                                    │
│     • Temperature: 0.1 → deterministic output                               │
│     • Response: structured JSON                                             │
│     • Timeout: 3.5s per model attempt                                       │
│     • Fallback chain: gemini-3.6-flash → gemini-flash-latest →             │
│       gemini-2.5-flash-lite → gemini-3.5-flash → Smart NLP                 │
│                                                                              │
│  B) SMART NLP (Fallback):                                                   │
│     • 12 regex + keyword rules                                              │
│     • Scoring: regex=+40, keyword=+25                                      │
│     • Contextual severity elevation/de-escalation                           │
│     • Confidence: 0.78–0.98                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMBEDDING GENERATION                                      │
│  • Normalized text: "Category: X | Complaint: Y | Summary: Z"               │
│  • Gemini Embedding API → 3072-dim vector                                   │
│  • Stored in Supabase embeddings table                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DUPLICATE DETECTION ENGINE                                │
│                                                                              │
│  1. Query active incidents within 250m radius                               │
│  2. For each candidate:                                                     │
│     • Haversine distance → geoScore (0.0–1.0)                              │
│     • Cosine similarity of 3072-dim embeddings → semanticScore            │
│       (fallback: token overlap Jaccard if no embeddings)                    │
│     • Category match bonus (if same category)                               │
│     • Combined score = 0.65 × semantic + 0.35 × geo                       │
│  3. Threshold: semantic ≥ 0.75 AND combined ≥ 0.78                         │
│  4. If match found → create duplicate_relation (PENDING status)             │
│  5. If no match → create new master incident                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRIORITY SCORING ENGINE                                   │
│                                                                              │
│  Weighted multi-factor score (0–100):                                       │
│  • Safety Risk (highest weight) — life-threatening potential               │
│  • Public Impact — population density, location sensitivity                │
│  • Severity — infrastructure damage extent                                 │
│  • Recurrence — historical repeat patterns                                 │
│  • Location Sensitivity — schools, hospitals, main roads                   │
│                                                                              │
│  Priority Tiers: CRITICAL (≥80), HIGH (≥60), MEDIUM (≥40), LOW (<40)      │
│                                                                              │
│  SLA Timers start: CRITICAL=4h, HIGH=24h, MEDIUM=72h, LOW=168h            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                         SUPABASE POSTGRESQL                                  ║
║  incidents → reports → embeddings → duplicate_relations                    ║
║  All writes audited in audit_logs table                                     ║
║  RLS policies enforce row-level access                                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHORITY DASHBOARD                                  │
│                                                                              │
│  • Map view: all incidents plotted with color-coded severity               │
│  • Hotspot detection: density clustering (500m radius, min 3 incidents)    │
│  • Recurrence analysis: spatial + temporal clustering (180-day lookback)   │
│  • SLA monitoring: ON_TRACK / AT_RISK / BREACHED per incident              │
│  • Escalation engine: NONE / WATCH / URGENT / EMERGENCY_REVIEW             │
│  • Trend analysis: period-over-period comparison                            │
│  • Priority queue: sorted by score, SLA countdown                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RESOLUTION WORKFLOW                                       │
│                                                                              │
│  1. Authority assigns incident → Worker                                    │
│  2. Worker updates status (IN_PROGRESS → RESOLVED)                          │
│  3. Worker uploads resolution evidence (photo + notes)                      │
│  4. Authority reviews evidence → marks for citizen verification             │
│  5. Citizen receives notification → reviews evidence on map                 │
│  6. Citizen verifies → status = VERIFIED → case CLOSED                     │
│  7. If citizen rejects → status = REOPENED → back to authority             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. FILE & CODE STRUCTURE

```
civicshield/
├── ai_engine/                          # Python AI microservice
│   ├── app.py                          # FastAPI server entry point
│   ├── pipeline.py                     # 4-tier pipeline orchestrator
│   ├── client.py                       # API client for AI service
│   ├── requirements.txt                # Python dependencies
│   └── models/
│       ├── yolo_detector.py            # TIER 1: YOLOv8 object detection
│       ├── clip_matcher.py             # TIER 2: CLIP cross-modal verification
│       ├── rf_severity_classifier.py   # TIER 3: Random Forest (category + severity)
│       └── isolation_forest_anomaly.py  # TIER 4: Isolation Forest anomaly detection
│
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # Root layout with auth provider
│   ├── page.tsx                        # Landing page
│   ├── globals.css                     # Global styles (Tailwind)
│   ├── error.tsx                       # Error boundary
│   ├── not-found.tsx                   # 404 page
│   ├── loading.tsx                     # Loading state
│   ├── login/                          # Login page
│   ├── signup/                         # Signup page
│   ├── report/                         # Report submission page
│   ├── track/                          # Report tracking page
│   ├── dashboard/                      # Citizen dashboard
│   ├── my-reports/                     # User's report history
│   ├── how-it-works/                   # Platform explanation
│   ├── about/                          # About page
│   ├── authority/                      # Authority dashboard group
│   │   ├── intelligence/               # Intelligence sub-pages
│   │   ├── operations/                 # Operations management
│   │   ├── evidence/                   # Evidence review
│   │   └── workers/                    # Worker management
│   ├── worker/                         # Worker dashboard
│   └── citizen/                        # Citizen-specific views
│
├── app/api/                            # Next.js API Routes
│   ├── ai/analyze/route.ts             # AI analysis endpoint
│   ├── auth/                           # Authentication routes
│   │   ├── login/route.ts
│   │   ├── signup/route.ts
│   │   ├── logout/route.ts
│   │   └── me/route.ts
│   ├── upload/route.ts                 # File upload
│   ├── reports/                        # Report management
│   │   └── track/route.ts
│   ├── incidents/                      # Incident CRUD
│   ├── authority/                      # Authority-specific routes
│   │   ├── evidence/                   # Evidence management
│   │   └── intelligence/               # All intelligence engines
│   ├── worker/                         # Worker routes
│   ├── priority/route.ts               # Priority scoring
│   ├── health/route.ts                 # Health check
│   └── v1/                             # Versioned API
│
├── components/                         # Shared React components
│   ├── shared/                         # Common UI components
│   ├── maps/                           # Map-related components
│   ├── citizen/                        # Citizen-specific components
│   ├── authority/                      # Authority-specific components
│   ├── worker/                         # Worker-specific components
│   └── ui/                             # Primitive UI components
│
├── lib/                                # Core library modules
│   ├── ai/                             # AI integration layer
│   │   ├── gemini.ts                   # Gemini API client
│   │   ├── embeddings.ts               # Gemini embedding generation
│   │   ├── smart-categorizer.ts        # Rule-based NLP fallback
│   │   ├── ai-persistence.ts           # AI result caching
│   │   ├── schema.ts                   # Zod schemas for AI output
│   │   └── test-cases.ts               # AI test cases
│   ├── auth/                           # Authentication logic
│   │   └── session.ts                  # Session management, password hashing
│   ├── db/                             # Database layer
│   │   ├── supabase-client.ts          # Client-side Supabase
│   │   ├── supabase-server.ts          # Server-side Supabase (service role)
│   │   ├── supabase-admin.ts           # Admin Supabase client
│   │   ├── mock-store.ts               # In-memory mock data store
│   │   ├── schema.ts                   # TypeScript types for DB records
│   │   └── storage-config.ts           # Mock/Supabase mode toggle
│   ├── duplicates/                     # Duplicate detection engine
│   │   ├── duplicate-detector.ts       # Core duplicate detection logic
│   │   └── test-suite.ts               # Duplicate detection tests
│   ├── intelligence/                   # Analytics & intelligence engines
│   │   ├── hotspots.ts                 # Hotspot detection
│   │   ├── recurring.ts                # Recurring problem detection
│   │   ├── escalation.ts               # Emergency escalation engine
│   │   ├── sla.ts                      # SLA monitoring
│   │   ├── trends.ts                   # Trend analysis
│   │   ├── root-causes.ts              # Root cause analysis
│   │   ├── geographic.ts               # Geo calculations (Haversine, centroid)
│   │   ├── aggregations.ts             # Data aggregation utilities
│   │   ├── departments.ts              # Department management
│   │   ├── time-windows.ts             # Time window configurations
│   │   └── types.ts                    # Shared type definitions
│   ├── priority/                       # Priority scoring engine
│   │   ├── priority-engine.ts          # Core priority calculation
│   │   └── test-suite.ts               # Priority engine tests
│   ├── maps/                           # Map utilities
│   ├── constants/                      # App-wide constants
│   │   └── departments.ts              # Department codes and names
│   ├── utils/                          # General utilities
│   └── logging/                        # Logging configuration
│
├── types/                              # TypeScript type definitions
│   ├── incident.ts                     # Incident, CitizenReport, MasterIncident types
│   ├── user.ts                         # User profile types
│   ├── ai.ts                           # AI analysis types
│   └── speech-recognition.d.ts         # Speech recognition type declarations
│
├── data/                               # Static data files
│   └── mock-store.json                 # JSON seed data for mock mode
│
├── supabase/                           # Supabase configuration
│   ├── migrations/                     # Database migrations
│   │   └── 001_initial_schema.sql      # Initial schema: 8 tables, indexes, RLS
│   └── seed.sql                        # Demo seed data
│
├── public/                             # Static assets
│   ├── images/                         # Static images
│   ├── favicon.ico                     # Favicon
│   └── ...
│
├── lib/hardening/                      # Security test suite
│   └── test-suite.ts                   # Phase 4H security hardening tests
│
├── docs/                               # Documentation
├── scripts/                            # Build/deploy scripts
├── scratch/                            # Development scratchpad
│
├── package.json                        # JS dependencies
├── package-lock.json                   # Locked dependency versions
├── tsconfig.json                       # TypeScript configuration
├── next.config.ts                      # Next.js configuration
├── postcss.config.mjs                  # PostCSS configuration
├── tailwind.config.ts                  # Tailwind CSS configuration
├── eslint.config.mjs                   # ESLint configuration
├── CLAUDE.md                           # Project instructions
├── AGENTS.md                           # Agent instructions
└── README.md                           # Project readme
```

---

## 13. SUMMARY: EVERYTHING AT A GLANCE

| Category | Technology | Count |
|----------|-----------|-------|
| **Frontend frameworks** | Next.js 16, React 19, TypeScript 5 | 3 |
| **Styling** | Tailwind CSS v4, PostCSS, clsx, tailwind-merge | 4 |
| **Mapping** | Leaflet, React-Leaflet, Lucide React | 3 |
| **Real-time** | LiveKit Client + Server SDK | 2 |
| **Backend** | Next.js API Routes (30+ endpoints) | 1 |
| **BaaS** | Supabase (PostgreSQL + Auth + Storage + RLS) | 1 |
| **Validation** | Zod (server + client) | 1 |
| **ML Framework** | PyTorch (CLIP), Ultralytics (YOLO), scikit-learn (RF + IF) | 3 |
| **ML Models** | YOLOv8n, CLIP ViT-B/32, RF×2, Isolation Forest, Gemini, Gemini Embeddings | 7 |
| **NLP** | Gemini API + Smart NLP (regex + keyword rules) | 2 |
| **Database tables** | 8 tables + 13 indexes + pgvector | 8 |
| **Auth mechanisms** | scrypt KDF, 256-bit sessions, RBAC, rate limiting | 4 |
| **Spatial algorithms** | Haversine, centroid, max-radius, density clustering, cosine similarity | 5 |
| **Intelligence engines** | Hotspots, Recurrence, Escalation, SLA, Trends, Root Causes, Priority | 7 |
| **Security features** | RLS, timing-safe compare, role hardening, enumeration protection, AI isolation | 6+ |
| **File types supported** | JPEG, PNG, WebP (images); JSON (data) | 3 |
| **Environment modes** | Mock (development) + Supabase (production) | 2 |
